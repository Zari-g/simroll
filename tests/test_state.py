import pytest

from simroll.engine import GrapplingGraph
from simroll.models import GrapplingState


@pytest.fixture
def graph() -> GrapplingGraph:
    return GrapplingGraph.from_default_data()


def test_grappling_state_normalizes_duplicate_grips_without_mutating_input() -> None:
    input_grips = ["wrist_control", "wrist_control", "sleeve_grip"]
    original_input = input_grips.copy()

    state = GrapplingState(
        position_id="closed_guard_bottom",
        mode="gi",
        active_grips=input_grips,
    )

    assert state.active_grips == frozenset({"wrist_control", "sleeve_grip"})
    assert input_grips == original_input


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
        active_grips=["missing_grip"],
    )

    with pytest.raises(KeyError, match="Unknown grip ID 'missing_grip'"):
        graph.validate_state(state)


def test_validate_state_rejects_gi_required_grip_in_no_gi(
    graph: GrapplingGraph,
) -> None:
    state = GrapplingState(
        position_id="closed_guard_bottom",
        mode="no_gi",
        active_grips=["sleeve_grip"],
    )

    with pytest.raises(
        ValueError,
        match="Gi-required grip 'sleeve_grip' cannot be active in no_gi mode",
    ):
        graph.validate_state(state)


def test_apply_transition_updates_position_and_grips_without_mutation(
    graph: GrapplingGraph,
) -> None:
    input_grips = ["wrist_control", "sleeve_grip"]
    original_input = input_grips.copy()
    state = GrapplingState(
        position_id="closed_guard_bottom",
        mode="gi",
        active_grips=input_grips,
    )
    original_transition = graph.get_transition("hip_bump_sweep").model_dump()

    result = graph.apply_transition(state, "hip_bump_sweep")

    assert result.position_id == "mount_top"
    assert result.active_grips == frozenset({"underhook", "sleeve_grip"})
    assert result is not state
    assert state.position_id == "closed_guard_bottom"
    assert state.active_grips == frozenset({"wrist_control", "sleeve_grip"})
    assert input_grips == original_input
    assert (
        graph.get_transition("hip_bump_sweep").model_dump()
        == original_transition
    )


def test_apply_transition_rejects_wrong_starting_position(
    graph: GrapplingGraph,
) -> None:
    state = GrapplingState(
        position_id="mount_top",
        mode="gi",
        active_grips=["sleeve_grip"],
    )

    with pytest.raises(
        ValueError,
        match=(
            "Transition 'flower_sweep' starts at 'closed_guard_bottom', "
            "but the state is at 'mount_top'"
        ),
    ):
        graph.apply_transition(state, "flower_sweep")


def test_apply_transition_rejects_missing_required_grips(
    graph: GrapplingGraph,
) -> None:
    state = GrapplingState(position_id="closed_guard_bottom", mode="gi")

    with pytest.raises(
        ValueError,
        match=(
            "Transition 'flower_sweep' is missing required active grips: "
            "'sleeve_grip'"
        ),
    ):
        graph.apply_transition(state, "flower_sweep")


def test_apply_transition_rejects_gi_only_transition_in_no_gi(
    graph: GrapplingGraph,
) -> None:
    state = GrapplingState(position_id="closed_guard_bottom", mode="no_gi")

    with pytest.raises(
        ValueError,
        match="Transition 'flower_sweep' is not allowed in no_gi mode",
    ):
        graph.apply_transition(state, "flower_sweep")


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
        active_grips=["underhook"],
    )

    result = graph.apply_transition(state, "elbow_escape")

    assert result.position_id == "closed_guard_bottom"
    assert result.active_grips == frozenset({"underhook"})
    assert state.position_id == "mount_top"
    assert state.active_grips == frozenset({"underhook"})
