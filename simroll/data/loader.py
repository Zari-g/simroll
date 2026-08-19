"""Load and validate SimRoll's human-readable runtime YAML data."""

from pathlib import Path
from typing import Any, TypeVar

import yaml
from pydantic import BaseModel

from simroll.models import Grip, Position, Transition


DATA_DIR = Path(__file__).parent

ModelT = TypeVar("ModelT", bound=BaseModel)


def load_positions(path: Path | str = DATA_DIR / "positions.yaml") -> dict[str, Position]:
    """Load positions from YAML, keyed by position ID."""

    positions = _load_records(path, Position, "position")
    for position in positions.values():
        if not position.gi_allowed and not position.no_gi_allowed:
            raise ValueError(
                f"Position '{position.id}' must allow at least one mode."
            )
    return positions


def load_grips(path: Path | str = DATA_DIR / "grips.yaml") -> dict[str, Grip]:
    """Load grips from YAML, keyed by grip ID."""

    controls = _load_records(path, Grip, "grip")
    for control in controls.values():
        if not control.gi_allowed and not control.no_gi_allowed:
            raise ValueError(
                f"Control '{control.id}' must allow at least one mode."
            )
        has_explicit_mode_flags = {
            "gi_allowed",
            "no_gi_allowed",
        }.issubset(control.model_fields_set)
        if has_explicit_mode_flags and control.gi_required and (
            not control.gi_allowed or control.no_gi_allowed
        ):
            raise ValueError(
                f"Gi-required control '{control.id}' has incompatible mode flags."
            )
    return controls


def load_transitions(
    path: Path | str = DATA_DIR / "transitions.yaml",
    positions: dict[str, Position] | None = None,
    grips: dict[str, Grip] | None = None,
) -> dict[str, Transition]:
    """Load transitions from YAML, keyed by transition ID.

    Position and grip dictionaries can be passed in when loading custom data.
    If omitted, the default runtime position and control YAML files are loaded.
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
    for position in positions.values():
        for field_name in ("allowed_controls", "common_controls"):
            for control_id in getattr(position, field_name):
                if control_id not in grips:
                    raise ValueError(
                        f"Position '{position.id}' references unknown control "
                        f"'{control_id}' in {field_name}."
                    )

    outgoing_from_terminal: set[str] = set()
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

        for requirement in transition.required_controls:
            if not set(requirement.modes).issubset(
                _transition_modes(transition)
            ):
                raise ValueError(
                    f"Transition '{transition.id}' has a required-control mode "
                    "that the transition does not allow."
                )
            for control_id in requirement.control_ids:
                _require_control(
                    transition.id, "required_controls", control_id, grips
                )
            for mode in requirement.modes:
                if not any(
                    _control_allows_mode(grips[control_id], mode)
                    for control_id in requirement.control_ids
                ):
                    raise ValueError(
                        f"Transition '{transition.id}' has no compatible control "
                        f"option for required mode '{mode}'."
                    )

        for field_name in (
            "created_controls",
            "removed_controls",
            "optional_controls",
            "controls_preserved_if_valid",
        ):
            for control in getattr(transition, field_name):
                _require_control(
                    transition.id, field_name, control.control_id, grips
                )

        for mode in _transition_modes(transition):
            if not _position_allows_mode(positions[transition.from_position], mode):
                raise ValueError(
                    f"Transition '{transition.id}' allows mode '{mode}' but its "
                    f"source position '{transition.from_position}' does not."
                )
            if not _position_allows_mode(positions[transition.to_position], mode):
                raise ValueError(
                    f"Transition '{transition.id}' allows mode '{mode}' but its "
                    f"destination position '{transition.to_position}' does not."
                )

        destination = positions[transition.to_position]
        if (transition.submission or transition.terminal) and not destination.terminal:
            raise ValueError(
                f"Terminal transition '{transition.id}' references non-terminal "
                f"position '{destination.id}'."
            )
        if destination.terminal and not transition.terminal:
            raise ValueError(
                f"Transition '{transition.id}' references terminal position "
                f"'{destination.id}' without terminal=true."
            )
        if positions[transition.from_position].terminal:
            outgoing_from_terminal.add(transition.from_position)

    if outgoing_from_terminal:
        terminal_ids = ", ".join(sorted(outgoing_from_terminal))
        raise ValueError(
            f"Terminal positions cannot have outgoing transitions: {terminal_ids}."
        )


def _transition_modes(transition: Transition) -> set[str]:
    modes: set[str] = set()
    if transition.gi_allowed:
        modes.add("gi")
    if transition.no_gi_allowed:
        modes.add("no_gi")
    if not modes:
        raise ValueError(
            f"Transition '{transition.id}' must allow at least one mode."
        )
    return modes


def _position_allows_mode(position: Position, mode: str) -> bool:
    return position.gi_allowed if mode == "gi" else position.no_gi_allowed


def _control_allows_mode(control: Grip, mode: str) -> bool:
    return control.gi_allowed if mode == "gi" else control.no_gi_allowed


def _require_control(
    transition_id: str,
    field_name: str,
    control_id: str,
    controls: dict[str, Grip],
) -> None:
    if control_id not in controls:
        raise ValueError(
            f"Transition '{transition_id}' references unknown control "
            f"'{control_id}' in {field_name}."
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
