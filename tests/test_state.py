import pytest
from pydantic import ValidationError

from simroll.engine import GrapplingGraph
from simroll.models import (
    ActiveControl,
    GrapplingState,
    PlayerId,
    Position,
    Transition,
)


@pytest.fixture
def graph() -> GrapplingGraph:
    return GrapplingGraph.from_default_data()


def test_grappling_state_normalizes_duplicate_controls_without_mutation() -> None:
    input_controls = [
        _control("wrist_control"),
        _control("wrist_control"),
        _control("sleeve_grip"),
    ]
    original_input = input_controls.copy()

    state = GrapplingState(
        position_id="closed_guard_bottom",
        mode="gi",
        active_controls=input_controls,
    )

    assert state.active_controls == frozenset(
        {_control("wrist_control"), _control("sleeve_grip")}
    )
    assert input_controls == original_input


def test_active_control_rejects_same_owner_and_target() -> None:
    with pytest.raises(ValidationError, match="owner and target must be different"):
        ActiveControl(control_id="underhook", owner="player_a", target="player_a")


def test_same_control_type_can_exist_with_different_owners() -> None:
    controls = frozenset(
        {_control("underhook"), _control("underhook", owner="player_b")}
    )

    assert len(controls) == 2


def test_grappling_state_is_hashable() -> None:
    state = GrapplingState(
        position_id="closed_guard_bottom",
        mode="gi",
        active_controls={_control("wrist_control")},
    )

    assert {state: "visited"}[state] == "visited"


def test_grappling_state_rejects_an_unsupported_mode() -> None:
    with pytest.raises(ValueError, match="Unsupported grappling mode 'mma'"):
        GrapplingState(
            position_id="closed_guard_bottom",
            mode="mma",  # type: ignore[arg-type]
        )


def test_grappling_state_is_immutable() -> None:
    state = GrapplingState(position_id="closed_guard_bottom", mode="gi")

    with pytest.raises(ValueError, match="Instance is frozen"):
        state.position_id = "mount_top"

    assert state.position_id == "closed_guard_bottom"


def test_validate_state_rejects_unknown_position(graph: GrapplingGraph) -> None:
    state = GrapplingState(position_id="missing_position", mode="gi")

    with pytest.raises(KeyError, match="Unknown position ID 'missing_position'"):
        graph.validate_state(state)


def test_validate_state_rejects_unknown_grip(graph: GrapplingGraph) -> None:
    state = GrapplingState(
        position_id="closed_guard_bottom",
        mode="gi",
        active_controls=[_control("missing_grip")],
    )

    with pytest.raises(KeyError, match="Unknown grip ID 'missing_grip'"):
        graph.validate_state(state)


def test_validate_state_rejects_gi_required_grip_in_no_gi(
    graph: GrapplingGraph,
) -> None:
    state = GrapplingState(
        position_id="closed_guard_bottom",
        mode="no_gi",
        active_controls=[_control("sleeve_grip")],
    )

    with pytest.raises(
        ValueError,
        match="Gi-required grip 'sleeve_grip' cannot be active in no_gi mode",
    ):
        graph.validate_state(state)


def test_apply_transition_updates_position_and_controls_without_mutation(
    graph: GrapplingGraph,
) -> None:
    input_controls = [_control("wrist_control"), _control("sleeve_grip")]
    original_input = input_controls.copy()
    state = GrapplingState(
        position_id="closed_guard_bottom",
        mode="gi",
        active_controls=input_controls,
    )
    original_transition = graph.get_transition("closed_guard_bottom_hip_bump_to_mount_top").model_dump()

    result = graph.apply_transition(state, "closed_guard_bottom_hip_bump_to_mount_top")

    assert result.position_id == "mount_top"
    assert result.active_controls == frozenset(
        {_control("wrist_control"), _control("sleeve_grip")}
    )
    assert result is not state
    assert state.position_id == "closed_guard_bottom"
    assert state.active_controls == frozenset(
        {_control("wrist_control"), _control("sleeve_grip")}
    )
    assert input_controls == original_input
    assert (
        graph.get_transition("closed_guard_bottom_hip_bump_to_mount_top").model_dump()
        == original_transition
    )


def test_apply_transition_rejects_wrong_starting_position(
    graph: GrapplingGraph,
) -> None:
    state = GrapplingState(
        position_id="mount_top",
        mode="gi",
        active_controls=[_control("sleeve_grip")],
    )

    with pytest.raises(
        ValueError,
        match=(
            "Transition 'closed_guard_bottom_arm_drag_to_back_control_top' starts at 'closed_guard_bottom', "
            "but the state is at 'mount_top'"
        ),
    ):
        graph.apply_transition(state, "closed_guard_bottom_arm_drag_to_back_control_top")


def test_apply_transition_rejects_missing_required_controls(
    graph: GrapplingGraph,
) -> None:
    state = GrapplingState(position_id="closed_guard_bottom", mode="gi")

    with pytest.raises(
        ValueError,
        match=(
            "Transition 'closed_guard_bottom_arm_drag_to_back_control_top' is missing required active controls: "
                "one of .* owned by player_a"
        ),
    ):
        graph.apply_transition(state, "closed_guard_bottom_arm_drag_to_back_control_top")


def test_apply_transition_accepts_no_gi_owned_control_requirement(
    graph: GrapplingGraph,
) -> None:
    state = GrapplingState(
        position_id="closed_guard_bottom",
        mode="no_gi",
        active_controls={_control("wrist_control")},
    )

    result = graph.apply_transition(
        state, "closed_guard_bottom_arm_drag_to_back_control_top"
    )

    assert result.position_id == "back_control_top"


def test_apply_transition_rejects_unknown_transition(graph: GrapplingGraph) -> None:
    state = GrapplingState(position_id="closed_guard_bottom", mode="gi")

    with pytest.raises(KeyError, match="Unknown transition ID 'missing_transition'"):
        graph.apply_transition(state, "missing_transition")


def test_apply_transition_with_no_grip_changes_preserves_grips(
    graph: GrapplingGraph,
) -> None:
    state = GrapplingState(
        position_id="mount_top",
        mode="no_gi",
        active_controls=[_control("underhook")],
    )

    result = graph.apply_transition(state, "mount_top_opponent_elbow_knee_to_half_guard_top")

    assert result.position_id == "half_guard_top"
    assert result.active_controls == frozenset({_control("underhook")})
    assert state.position_id == "mount_top"
    assert state.active_controls == frozenset({_control("underhook")})


def test_transition_requires_correct_owner_control(graph: GrapplingGraph) -> None:
    state = GrapplingState(
        position_id="closed_guard_bottom",
        mode="gi",
        active_controls={_control("wrist_control")},
    )

    result = graph.apply_transition(
        state, "closed_guard_bottom_arm_drag_to_back_control_top"
    )

    assert result.position_id == "back_control_top"
    assert _control("wrist_control") in result.active_controls


def test_wrong_owner_does_not_satisfy_transition(graph: GrapplingGraph) -> None:
    state = GrapplingState(
        position_id="closed_guard_bottom",
        mode="gi",
        active_controls={_control("wrist_control", owner="player_b")},
    )

    with pytest.raises(ValueError, match="owned by player_a"):
        graph.apply_transition(
            state, "closed_guard_bottom_arm_drag_to_back_control_top"
        )


def test_runtime_control_lifecycle_is_deferred(graph: GrapplingGraph) -> None:
    player_b_control = _control("wrist_control", owner="player_b")
    state = GrapplingState(
        position_id="closed_guard_bottom",
        mode="gi",
        active_controls={_control("wrist_control"), player_b_control},
    )

    result = graph.apply_transition(state, "closed_guard_bottom_hip_bump_to_mount_top")

    assert player_b_control in result.active_controls
    assert _control("wrist_control") in result.active_controls


@pytest.fixture
def position_mode_graph() -> GrapplingGraph:
    positions = {
        "both_modes": _position("both_modes"),
        "gi_only": _position("gi_only", no_gi_allowed=False),
        "no_gi_only": _position("no_gi_only", gi_allowed=False),
    }
    transition = Transition(
        id="move_to_gi_only",
        name="Move to Gi-only Position",
        from_position="both_modes",
        to_position="gi_only",
        transition_type="test",
        gi_allowed=True,
        no_gi_allowed=True,
        difficulty="beginner",
    )
    return GrapplingGraph(positions, {transition.id: transition}, {})


def test_validate_state_rejects_gi_only_position_in_no_gi(
    position_mode_graph: GrapplingGraph,
) -> None:
    state = GrapplingState(position_id="gi_only", mode="no_gi")

    with pytest.raises(
        ValueError,
        match="Position 'gi_only' is not allowed in no_gi mode",
    ):
        position_mode_graph.validate_state(state)


def test_validate_state_rejects_no_gi_only_position_in_gi(
    position_mode_graph: GrapplingGraph,
) -> None:
    state = GrapplingState(position_id="no_gi_only", mode="gi")

    with pytest.raises(
        ValueError,
        match="Position 'no_gi_only' is not allowed in gi mode",
    ):
        position_mode_graph.validate_state(state)


def test_validate_state_accepts_valid_position_in_gi(
    position_mode_graph: GrapplingGraph,
) -> None:
    state = GrapplingState(position_id="gi_only", mode="gi")

    position_mode_graph.validate_state(state)


def test_validate_state_accepts_valid_position_in_no_gi(
    position_mode_graph: GrapplingGraph,
) -> None:
    state = GrapplingState(position_id="no_gi_only", mode="no_gi")

    position_mode_graph.validate_state(state)


def test_apply_transition_rejects_destination_unavailable_in_current_mode(
    position_mode_graph: GrapplingGraph,
) -> None:
    state = GrapplingState(position_id="both_modes", mode="no_gi")

    with pytest.raises(
        ValueError,
        match="Position 'gi_only' is not allowed in no_gi mode",
    ):
        position_mode_graph.apply_transition(state, "move_to_gi_only")


def _position(
    position_id: str,
    *,
    gi_allowed: bool = True,
    no_gi_allowed: bool = True,
) -> Position:
    return Position(
        id=position_id,
        name=position_id.replace("_", " ").title(),
        category="test",
        player_role="test",
        gi_allowed=gi_allowed,
        no_gi_allowed=no_gi_allowed,
        description="Custom test position.",
    )


def _control(
    control_id: str,
    *,
    owner: PlayerId = "player_a",
) -> ActiveControl:
    target: PlayerId = "player_b" if owner == "player_a" else "player_a"
    return ActiveControl(
        control_id=control_id,
        owner=owner,
        target=target,
    )
