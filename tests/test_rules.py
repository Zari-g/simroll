import pytest

from simroll.engine import GrapplingGraph, is_transition_available
from simroll.engine.control_semantics import owned_controls
from simroll.models import ActiveControl


@pytest.fixture
def graph() -> GrapplingGraph:
    return GrapplingGraph.from_default_data()


def test_any_of_owned_control_requirement(graph: GrapplingGraph) -> None:
    transition = graph.get_transition(
        "closed_guard_bottom_arm_drag_to_back_control_top"
    )

    assert is_transition_available(
        transition, "gi", owned_controls(["sleeve_grip"])
    )
    assert is_transition_available(
        transition, "no_gi", owned_controls(["wrist_control"])
    )
    assert not is_transition_available(transition, "gi", [])


def test_wrong_owner_does_not_satisfy_requirement(
    graph: GrapplingGraph,
) -> None:
    transition = graph.get_transition(
        "closed_guard_top_opponent_arm_drag_to_back_control_bottom"
    )
    player_a_control = ActiveControl(
        control_id="wrist_control", owner="player_a", target="player_b"
    )
    player_b_control = ActiveControl(
        control_id="wrist_control", owner="player_b", target="player_a"
    )

    assert not is_transition_available(transition, "no_gi", [player_a_control])
    assert is_transition_available(transition, "no_gi", [player_b_control])


def test_mode_scoped_requirement_options_are_conservative(
    graph: GrapplingGraph,
) -> None:
    transition = graph.get_transition(
        "half_guard_bottom_old_school_sweep_to_side_control_top"
    )
    gi_controls = owned_controls(["underhook", "pants_grip"])
    no_gi_controls = owned_controls(["underhook", "leg_control"])

    assert is_transition_available(transition, "gi", gi_controls)
    assert not is_transition_available(transition, "no_gi", gi_controls)
    assert is_transition_available(transition, "no_gi", no_gi_controls)


def test_transition_without_requirements_is_available(graph: GrapplingGraph) -> None:
    transition = graph.get_transition(
        "closed_guard_bottom_hip_bump_to_mount_top"
    )

    assert is_transition_available(transition, "gi", [])
    assert is_transition_available(transition, "no_gi", [])


def test_available_transitions_are_deterministic_and_state_aware(
    graph: GrapplingGraph,
) -> None:
    without_controls = graph.get_available_transitions(
        "closed_guard_bottom", "no_gi", []
    )
    with_control = graph.get_available_transitions(
        "closed_guard_bottom", "no_gi", owned_controls(["wrist_control"])
    )

    assert [item.id for item in without_controls] == [
        "closed_guard_bottom_hip_bump_to_mount_top",
        "closed_guard_bottom_opponent_stand_open_to_open_guard_bottom",
    ]
    assert [item.id for item in with_control] == [
        "closed_guard_bottom_arm_drag_to_back_control_top",
        "closed_guard_bottom_hip_bump_to_mount_top",
        "closed_guard_bottom_opponent_stand_open_to_open_guard_bottom",
    ]


def test_available_transitions_reject_invalid_inputs(graph: GrapplingGraph) -> None:
    with pytest.raises(KeyError, match="Unknown position ID 'missing_position'"):
        graph.get_available_transitions("missing_position", "gi", [])
    with pytest.raises(ValueError, match="Unsupported grappling mode"):
        graph.get_available_transitions(
            "submission_terminal", "invalid", []  # type: ignore[arg-type]
        )
