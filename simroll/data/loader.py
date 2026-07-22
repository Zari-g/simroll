"""Load SimRoll starter data from YAML files."""

from pathlib import Path
from typing import Any, TypeVar

import yaml
from pydantic import BaseModel

from simroll.models import Grip, Position, Transition


DATA_DIR = Path(__file__).parent

ModelT = TypeVar("ModelT", bound=BaseModel)


def load_positions(path: Path | str = DATA_DIR / "positions.yaml") -> dict[str, Position]:
    """Load positions from YAML, keyed by position ID."""

    return _load_records(path, Position, "position")


def load_grips(path: Path | str = DATA_DIR / "grips.yaml") -> dict[str, Grip]:
    """Load grips from YAML, keyed by grip ID."""

    return _load_records(path, Grip, "grip")


def load_transitions(
    path: Path | str = DATA_DIR / "transitions.yaml",
    positions: dict[str, Position] | None = None,
    grips: dict[str, Grip] | None = None,
) -> dict[str, Transition]:
    """Load transitions from YAML, keyed by transition ID.

    Position and grip dictionaries can be passed in when loading custom data.
    If omitted, the starter position and grip YAML files are loaded.
    """

    loaded_positions = positions if positions is not None else load_positions()
    loaded_grips = grips if grips is not None else load_grips()
    transitions = _load_records(path, Transition, "transition")

    _validate_transition_relationships(transitions, loaded_positions, loaded_grips)
    return transitions


def _load_records(path: Path | str, model: type[ModelT], record_name: str) -> dict[str, ModelT]:
    yaml_path = Path(path)
    raw_records = _read_yaml_list(yaml_path)
    _reject_duplicate_ids(raw_records, record_name, yaml_path)

    records: dict[str, ModelT] = {}
    for raw_record in raw_records:
        record = model(**raw_record)
        records[record.id] = record

    return records


def _read_yaml_list(path: Path) -> list[dict[str, Any]]:
    with path.open("r", encoding="utf-8") as file:
        data = yaml.safe_load(file)

    if data is None:
        return []

    if not isinstance(data, list):
        raise ValueError(f"Expected {path} to contain a list of records.")

    for item in data:
        if not isinstance(item, dict):
            raise ValueError(f"Expected every record in {path} to be a mapping.")

    return data


def _reject_duplicate_ids(
    raw_records: list[dict[str, Any]], record_name: str, path: Path
) -> None:
    seen_ids: set[str] = set()

    for raw_record in raw_records:
        record_id = raw_record.get("id")
        if record_id in seen_ids:
            raise ValueError(f"Duplicate {record_name} ID '{record_id}' in {path}.")
        seen_ids.add(record_id)


def _validate_transition_relationships(
    transitions: dict[str, Transition],
    positions: dict[str, Position],
    grips: dict[str, Grip],
) -> None:
    for transition in transitions.values():
        _require_position(transition.id, "from_position", transition.from_position, positions)
        _require_position(transition.id, "to_position", transition.to_position, positions)

        for field_name in ("required_grips", "created_grips", "removed_grips"):
            for grip_id in getattr(transition, field_name):
                if grip_id not in grips:
                    raise ValueError(
                        "Transition "
                        f"'{transition.id}' references unknown grip '{grip_id}' "
                        f"in {field_name}."
                    )


def _require_position(
    transition_id: str,
    field_name: str,
    position_id: str,
    positions: dict[str, Position],
) -> None:
    if position_id not in positions:
        raise ValueError(
            "Transition "
            f"'{transition_id}' references unknown position '{position_id}' "
            f"in {field_name}."
        )
