from pathlib import Path

import networkx as nx
import pytest
import yaml
from pydantic import ValidationError

from simroll.data import load_grips, load_positions, load_transitions
from simroll.datasets.importer import load_normalized_dataset
from simroll.engine import GrapplingGraph, GrapplingPathfinder, RollSimulator
from simroll.engine.control_semantics import owned_controls
from simroll.models import GrapplingState
from scripts.build_runtime_data import build_runtime_data


TRANSITIONS_PATH = Path("simroll/data/transitions.yaml")
NORMALIZED_PATH = Path("data/generated/simroll_bjj_mvp.normalized.json")


def test_curated_runtime_counts_and_graph_invariants() -> None:
    graph = GrapplingGraph.from_default_data()
    live_ids = {
        position.id for position in graph.positions.values() if not position.terminal
    }

    assert len(graph.positions) == 20
    assert len(live_ids) == 19
    assert len(graph.transitions) == 65
    assert sum(item.submission for item in graph.transitions.values()) == 10
    assert sum(
        item.ownership_review_required for item in graph.transitions.values()
    ) == 30
    assert len(graph.grips) == 17
    assert graph.get_position("submission_terminal").terminal
    assert graph.get_transitions_from("submission_terminal") == []
    assert all(graph.get_transitions_from(position_id) for position_id in live_ids)
    assert list(nx.strongly_connected_components(graph.graph.subgraph(live_ids))) == [
        live_ids
    ]


def test_runtime_ids_exactly_match_normalized_positional_dataset() -> None:
    graph = GrapplingGraph.from_default_data()
    normalized = load_normalized_dataset(NORMALIZED_PATH)

    assert set(graph.positions) == {item.id for item in normalized.positions}
    assert set(graph.transitions) == {
        item.id for item in normalized.positional_transitions
    }
    assert set(graph.grips) == {item.id for item in normalized.controls}
    assert set(graph.transitions).isdisjoint(
        item.id for item in normalized.control_change_templates
    )


def test_runtime_yaml_is_fresh_and_deterministically_generated() -> None:
    build_runtime_data(check=True)


def test_manual_review_metadata_remains_preserved() -> None:
    normalized = load_normalized_dataset(NORMALIZED_PATH)

    assert len(normalized.reviews.ownership_sensitive_transitions) == 30
    assert len(normalized.reviews.manual_review_transitions) == 11
    assert set(normalized.reviews.future_split_candidates) == {
        "half_guard_bottom_old_school_sweep_to_side_control_top",
        "open_guard_top_toreando_to_side_control_top",
    }


def test_owned_requirements_resolve_actor_and_opponent_to_stable_players() -> None:
    graph = GrapplingGraph.from_default_data()
    transition = graph.get_transition(
        "closed_guard_top_opponent_arm_drag_to_back_control_bottom"
    )
    requirement = transition.required_controls[0]

    assert transition.actor_player == "player_b"
    assert requirement.owner == "player_b"
    assert requirement.target == "player_a"
    assert transition.ownership_review_required


def test_gi_and_no_gi_requirement_options_filter_safely() -> None:
    graph = GrapplingGraph.from_default_data()
    transition = graph.get_transition(
        "half_guard_bottom_old_school_sweep_to_side_control_top"
    )

    assert transition in graph.get_available_transitions(
        "half_guard_bottom",
        "gi",
        owned_controls(["underhook", "pants_grip"]),
    )
    assert transition not in graph.get_available_transitions(
        "half_guard_bottom",
        "no_gi",
        owned_controls(["underhook", "pants_grip"]),
    )
    assert transition in graph.get_available_transitions(
        "half_guard_bottom",
        "no_gi",
        owned_controls(["underhook", "leg_control"]),
    )


def test_simulator_and_pathfinder_handle_expanded_and_terminal_states() -> None:
    graph = GrapplingGraph.from_default_data()
    simulator = RollSimulator(graph)
    start = GrapplingState(position_id="standing_neutral", mode="no_gi")
    terminal = GrapplingState(position_id="submission_terminal", mode="no_gi")

    assert simulator.random_step(start) is not None
    assert simulator.random_step(terminal) is None
    assert GrapplingPathfinder(graph).find_shortest_path(
        start, "closed_guard_bottom", max_depth=3
    ) is not None
    assert GrapplingPathfinder(graph).find_shortest_path(
        terminal, "standing_neutral", max_depth=3
    ) is None


def test_loader_rejects_unknown_owned_control(tmp_path: Path) -> None:
    records = _transition_records()
    records[0]["created_controls"] = [
        {"control_id": "missing", "owner": "player_a", "target": "player_b"}
    ]

    with pytest.raises(ValueError, match="unknown control 'missing'"):
        load_transitions(
            _write_transitions(tmp_path, records),
            positions=load_positions(),
            grips=load_grips(),
        )


def test_loader_rejects_malformed_owned_control_mapping(tmp_path: Path) -> None:
    records = _transition_records()
    records[0]["created_controls"] = [
        {
            "control_id": "underhook",
            "owner": "player_a",
            "target": "player_a",
        }
    ]

    with pytest.raises(ValidationError, match="owner and target must be different"):
        load_transitions(
            _write_transitions(tmp_path, records),
            positions=load_positions(),
            grips=load_grips(),
        )


def test_loader_rejects_invalid_terminal_reference(tmp_path: Path) -> None:
    records = _transition_records()
    records[0]["terminal"] = True

    with pytest.raises(ValueError, match="references non-terminal position"):
        load_transitions(
            _write_transitions(tmp_path, records),
            positions=load_positions(),
            grips=load_grips(),
        )


def test_loader_rejects_requirement_without_mode_compatible_control(
    tmp_path: Path,
) -> None:
    records = _transition_records()
    records[0]["required_controls"] = [
        {
            "match": "any_of",
            "control_ids": ["sleeve_grip"],
            "owner": "player_b",
            "target": "player_a",
            "modes": ["no_gi"],
        }
    ]

    with pytest.raises(ValueError, match="no compatible control option"):
        load_transitions(
            _write_transitions(tmp_path, records),
            positions=load_positions(),
            grips=load_grips(),
        )


def _transition_records() -> list[dict[str, object]]:
    with TRANSITIONS_PATH.open(encoding="utf-8") as source:
        return yaml.safe_load(source)


def _write_transitions(
    tmp_path: Path, records: list[dict[str, object]]
) -> Path:
    path = tmp_path / "transitions.yaml"
    with path.open("w", encoding="utf-8") as output:
        yaml.safe_dump(records, output, sort_keys=False)
    return path
