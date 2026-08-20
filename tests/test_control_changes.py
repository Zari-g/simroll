"""Iteration 11E same-position control-change coverage."""

import random

import pytest
from fastapi.testclient import TestClient

from simroll.api.app import app
from simroll.data import load_control_change_templates
from simroll.engine import GrapplingGraph, GrapplingPathfinder, RollSimulator
from simroll.models import ActiveControl, GrapplingState


@pytest.fixture(scope="module")
def graph() -> GrapplingGraph:
    return GrapplingGraph.from_default_data()


def _state(
    *,
    mode: str = "no_gi",
    controls: set[ActiveControl] | None = None,
) -> GrapplingState:
    return GrapplingState(
        position_id="closed_guard_bottom",
        mode=mode,
        active_controls=controls or set(),
    )


def _control(control_id: str, owner: str = "player_a") -> ActiveControl:
    target = "player_b" if owner == "player_a" else "player_a"
    return ActiveControl(control_id=control_id, owner=owner, target=target)


def test_exactly_five_parameterized_templates_are_loaded() -> None:
    templates = load_control_change_templates()

    assert set(templates) == {
        "establish_body_control",
        "establish_garment_grip",
        "establish_limb_control",
        "release_control",
        "switch_control",
    }
    assert templates["establish_limb_control"].parameter_control_ids


def test_acquisition_preserves_position_mode_and_player_identity(
    graph: GrapplingGraph,
) -> None:
    state = _state()
    action_id = "establish_limb_control:player_a:wrist_control"

    action = next(
        action
        for action in graph.get_available_control_changes(state)
        if action.id == action_id
    )
    result = graph.apply_control_change(state, action.id)

    assert result.position_id == state.position_id
    assert result.mode == state.mode
    assert _control("wrist_control") in result.active_controls
    assert action.created_controls[0].owner == "player_a"
    assert action.created_controls[0].target == "player_b"


def test_release_and_atomic_switch_are_valid(graph: GrapplingGraph) -> None:
    state = _state(controls={_control("wrist_control")})
    action_ids = {
        action.id for action in graph.get_available_control_changes(state)
    }

    assert "release_control:player_a:wrist_control" in action_ids
    switch_id = "switch_control:player_a:wrist_control:underhook"
    switched = graph.apply_control_change(state, switch_id)
    released = graph.apply_control_change(
        state, "release_control:player_a:wrist_control"
    )

    assert switched.active_controls == {_control("underhook")}
    assert released.active_controls == frozenset()


def test_generation_filters_duplicates_modes_and_position(
    graph: GrapplingGraph,
) -> None:
    state = _state(controls={_control("wrist_control")})
    action_ids = {
        action.id for action in graph.get_available_control_changes(state)
    }

    assert "establish_limb_control:player_a:wrist_control" not in action_ids
    assert not any("garment" in action_id for action_id in action_ids)
    assert not any("sleeve_grip" in action_id for action_id in action_ids)

    mount = GrapplingState(position_id="mount_top", mode="no_gi")
    mount_ids = {
        action.id for action in graph.get_available_control_changes(mount)
    }
    assert "establish_limb_control:player_a:ankle_control" not in mount_ids


def test_owner_target_validation_rejects_same_player() -> None:
    with pytest.raises(ValueError, match="must be different"):
        ActiveControl(
            control_id="wrist_control",
            owner="player_a",
            target="player_a",
        )


def test_simulator_mixes_actions_and_accounts_for_events(
    graph: GrapplingGraph,
) -> None:
    result = RollSimulator(graph).simulate(
        _state(), max_steps=10, rng=random.Random(0)
    )

    assert result.positional_steps > 0
    assert result.control_actions > 0
    assert result.total_events == len(result.actions)
    assert result.total_events == result.positional_steps + result.control_actions
    assert result.total_events <= 10
    assert all(
        left.id != right.id
        for left, right in zip(result.actions, result.actions[1:])
        if left.action_type == right.action_type == "control_change"
    )


def test_pathfinder_remains_positional_only(graph: GrapplingGraph) -> None:
    path = GrapplingPathfinder(graph).find_shortest_path(
        _state(controls={_control("wrist_control")}), "mount_top"
    )

    assert path is not None
    assert all(action_id in graph.transitions for action_id in path.transition_ids)


def test_roll_api_serializes_action_discriminator_and_counts() -> None:
    client = TestClient(app)
    state = {
        "position_id": "closed_guard_bottom",
        "mode": "no_gi",
        "active_controls": [],
    }
    available = client.post("/rolls/available", json={"state": state})
    assert available.status_code == 200
    assert {item["action_type"] for item in available.json()} == {
        "transition",
        "control_change",
    }

    action_id = "establish_limb_control:player_a:wrist_control"
    step = client.post(
        "/rolls/step", json={"state": state, "action_id": action_id}
    )
    assert step.status_code == 200
    assert step.json()["transition"]["action_type"] == "control_change"
    assert step.json()["next_state"]["position_id"] == state["position_id"]

    simulation = client.post(
        "/rolls/simulate", json={"start_state": state, "max_steps": 3}
    )
    path = simulation.json()["path"]
    assert path["total_events"] == len(path["actions"])
    assert path["total_events"] == (
        path["positional_steps"] + path["control_actions"]
    )
