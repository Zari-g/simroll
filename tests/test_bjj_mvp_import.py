import copy
import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from simroll.datasets import (
    DatasetValidationError,
    SourceDataset,
    import_dataset,
    load_normalized_dataset,
    load_source_dataset,
    normalize_dataset,
    validate_dataset,
)
from simroll.engine import GrapplingGraph


REPOSITORY_ROOT = Path(__file__).parents[1]
SOURCE_PATH = (
    REPOSITORY_ROOT
    / "data"
    / "curated"
    / "simroll_bjj_mvp_v1"
    / "simroll_bjj_mvp.json"
)
NORMALIZED_PATH = (
    REPOSITORY_ROOT
    / "data"
    / "generated"
    / "simroll_bjj_mvp.normalized.json"
)


@pytest.fixture(scope="module")
def source_dataset() -> SourceDataset:
    return load_source_dataset(SOURCE_PATH)


def test_complete_curated_source_loads(source_dataset: SourceDataset) -> None:
    validate_dataset(source_dataset)


def test_malformed_source_record_fails_typed_parsing() -> None:
    raw = _raw_source()
    raw["positions"][0]["unexpected_field"] = "not in the source contract"

    with pytest.raises(ValidationError, match="unexpected_field"):
        SourceDataset.model_validate(raw)


@pytest.mark.parametrize(
    ("collection", "label"),
    [
        ("positions", "position"),
        ("transitions", "transition"),
        ("control_vocabulary", "control"),
        ("control_change_transitions", "control-change template"),
    ],
)
def test_duplicate_ids_fail(collection: str, label: str) -> None:
    raw = _raw_source()
    raw[collection].append(copy.deepcopy(raw[collection][0]))
    dataset = SourceDataset.model_validate(raw)

    with pytest.raises(DatasetValidationError, match=f"Duplicate {label} ID"):
        validate_dataset(dataset)


@pytest.mark.parametrize("field_name", ["source_position", "destination_position"])
def test_unknown_transition_position_fails(field_name: str) -> None:
    raw = _raw_source()
    raw["transitions"][0][field_name] = "missing_position"
    dataset = SourceDataset.model_validate(raw)

    with pytest.raises(
        DatasetValidationError,
        match=(
            "references unknown position 'missing_position' "
            f"in {field_name}"
        ),
    ):
        validate_dataset(dataset)


@pytest.mark.parametrize(
    ("field_name", "replacement"),
    [
        (
            "required_controls",
            [
                {
                    "match": "any_of",
                    "control_ids": ["missing_control"],
                    "owner": "actor",
                    "target": "opponent",
                    "modes": ["gi", "nogi"],
                }
            ],
        ),
        (
            "optional_controls",
            [
                {
                    "control_id": "missing_control",
                    "owner": "actor",
                    "target": "opponent",
                }
            ],
        ),
        (
            "controls_added",
            [
                {
                    "control_id": "missing_control",
                    "owner": "actor",
                    "target": "opponent",
                }
            ],
        ),
        (
            "controls_removed",
            [
                {
                    "control_id": "missing_control",
                    "owner": "actor",
                    "target": "opponent",
                }
            ],
        ),
        (
            "controls_preserved_if_valid",
            [
                {
                    "control_id": "missing_control",
                    "owner": "actor",
                    "target": "opponent",
                }
            ],
        ),
    ],
)
def test_unknown_transition_control_fails(
    field_name: str, replacement: list[dict[str, object]]
) -> None:
    raw = _raw_source()
    raw["transitions"][0][field_name] = replacement
    dataset = SourceDataset.model_validate(raw)

    with pytest.raises(
        DatasetValidationError,
        match=f"unknown control 'missing_control' in {field_name}",
    ):
        validate_dataset(dataset)


@pytest.mark.parametrize(
    ("review_key", "label"),
    [
        ("manual_review_transitions", "Manual review"),
        ("ownership_review", "Ownership review"),
    ],
)
def test_review_queue_unknown_transition_fails(review_key: str, label: str) -> None:
    raw = _raw_source()
    raw[review_key][0]["transition_id"] = "missing_transition"
    dataset = SourceDataset.model_validate(raw)

    with pytest.raises(
        DatasetValidationError,
        match=f"{label} references unknown transition 'missing_transition'",
    ):
        validate_dataset(dataset)


def test_invalid_mode_fails_typed_parsing() -> None:
    raw = _raw_source()
    raw["transitions"][0]["modes"] = ["submission_only"]

    with pytest.raises(ValidationError, match="modes.0"):
        SourceDataset.model_validate(raw)


def test_invalid_control_category_fails_typed_parsing() -> None:
    raw = _raw_source()
    raw["control_vocabulary"][0]["category"] = "unclassified"

    with pytest.raises(ValidationError, match="category"):
        SourceDataset.model_validate(raw)


def test_malformed_terminal_metadata_fails() -> None:
    raw = _raw_source()
    raw["transitions"][0]["terminal"] = True
    dataset = SourceDataset.model_validate(raw)

    with pytest.raises(DatasetValidationError, match="malformed terminal metadata"):
        validate_dataset(dataset)


def test_malformed_submission_metadata_fails() -> None:
    raw = _raw_source()
    raw["transitions"][0]["submission"] = True
    dataset = SourceDataset.model_validate(raw)

    with pytest.raises(DatasetValidationError, match="malformed submission metadata"):
        validate_dataset(dataset)


def test_exact_mvp_counts_and_categories(source_dataset: SourceDataset) -> None:
    normalized = normalize_dataset(source_dataset)

    assert len(normalized.positions) == 20
    assert sum(not position.terminal for position in normalized.positions) == 19
    assert len(normalized.positional_transitions) == 65
    assert sum(item.submission for item in normalized.positional_transitions) == 10
    assert len(normalized.controls) == 17
    assert len(normalized.control_change_templates) == 5
    assert len(normalized.reviews.manual_review_transitions) == 11
    assert len(normalized.reviews.ownership_sensitive_transitions) == 30
    assert sum(item.mode == "gi" for item in normalized.example_rolls) == 5
    assert sum(item.mode == "no_gi" for item in normalized.example_rolls) == 5
    assert {
        category: sum(control.category == category for control in normalized.controls)
        for category in ("garment_grip", "limb_control", "body_control")
    } == {"garment_grip": 5, "limb_control": 5, "body_control": 7}


def test_normalized_output_preserves_all_reviewed_ids(
    source_dataset: SourceDataset,
) -> None:
    normalized = normalize_dataset(source_dataset)

    assert {item.id for item in normalized.positions} == {
        item.id for item in source_dataset.positions
    }
    assert {item.id for item in normalized.positional_transitions} == {
        item.id for item in source_dataset.transitions
    }
    assert {item.id for item in normalized.controls} == {
        item.id for item in source_dataset.control_vocabulary
    }


def test_normalization_is_byte_deterministic(tmp_path: Path) -> None:
    first_path = tmp_path / "first.json"
    second_path = tmp_path / "second.json"

    import_dataset(SOURCE_PATH, first_path)
    import_dataset(SOURCE_PATH, second_path)

    assert first_path.read_bytes() == second_path.read_bytes()


def test_committed_artifact_matches_importer(tmp_path: Path) -> None:
    regenerated_path = tmp_path / "regenerated.json"
    import_dataset(SOURCE_PATH, regenerated_path)

    assert regenerated_path.read_bytes() == NORMALIZED_PATH.read_bytes()
    load_normalized_dataset(NORMALIZED_PATH)


def test_normalized_mvp_runtime_graph_is_active() -> None:
    graph = GrapplingGraph.from_default_data()

    assert len(graph.positions) == 20
    assert len(graph.transitions) == 65
    assert len(graph.grips) == 17
    assert "submission_terminal" in graph.positions


def _raw_source() -> dict[str, object]:
    return json.loads(SOURCE_PATH.read_text(encoding="utf-8-sig"))
