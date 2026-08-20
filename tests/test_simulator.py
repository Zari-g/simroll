import random

import pytest

from simroll.engine import GrapplingGraph, RollSimulator
from simroll.engine.control_semantics import owned_controls
from simroll.models import (
    GrapplingState,
    Grip,
    Position,
    RollSimulation,
    Transition,
)


@pytest.fixture
def graph() -> GrapplingGraph:
    return GrapplingGraph.from_default_data()


@pytest.fixture
def simulator(graph: GrapplingGraph) -> RollSimulator:
    return RollSimulator(graph)


def test_step_applies_selected_transition_without_mutating_start_state(
    simulator: RollSimulator,
) -> None:
    start = GrapplingState(
        position_id="closed_guard_bottom",
        mode="gi",
        active_controls=owned_controls({"sleeve_grip", "wrist_control"}),
    )

    result = simulator.step(start, "closed_guard_bottom_hip_bump_to_mount_top")

    assert result == GrapplingState(
        position_id="mount_top",
        mode="gi",
        active_controls=frozenset(),
    )
    assert result is not start
    assert start.position_id == "closed_guard_bottom"
    assert start.active_controls == owned_controls(
        {"sleeve_grip", "wrist_control"}
    )


def test_step_rejects_transition_from_wrong_position(
    simulator: RollSimulator,
) -> None:
    state = GrapplingState(position_id="mount_top", mode="gi")

    with pytest.raises(
        ValueError,
        match="Transition 'closed_guard_bottom_arm_drag_to_back_control_top' starts at 'closed_guard_bottom'",
    ):
        simulator.step(state, "closed_guard_bottom_arm_drag_to_back_control_top")


def test_step_rejects_missing_required_grip(simulator: RollSimulator) -> None:
    state = GrapplingState(position_id="closed_guard_bottom", mode="gi")

    with pytest.raises(
        ValueError,
        match="missing required active controls: one of .* owned by player_a",
    ):
        simulator.step(state, "closed_guard_bottom_arm_drag_to_back_control_top")


def test_step_supports_no_gi_owned_control_requirement(
    simulator: RollSimulator,
) -> None:
    state = GrapplingState(
        position_id="closed_guard_bottom",
        mode="no_gi",
        active_controls=owned_controls({"wrist_control"}),
    )

    result = simulator.step(
        state, "closed_guard_bottom_arm_drag_to_back_control_top"
    )

    assert result.position_id == "back_control_top"


def test_available_transitions_include_only_valid_choices(
    simulator: RollSimulator,
) -> None:
    state = GrapplingState(
        position_id="closed_guard_bottom",
        mode="gi",
        active_controls=owned_controls({"wrist_control"}),
    )

    transitions = simulator.get_available_transitions(state)

    assert [transition.id for transition in transitions] == [
        "closed_guard_bottom_arm_drag_to_back_control_top",
        "closed_guard_bottom_hip_bump_to_mount_top",
        "closed_guard_bottom_opponent_stand_open_to_open_guard_bottom",
    ]


def test_available_transitions_exclude_invalid_mode(
    simulator: RollSimulator,
) -> None:
    state = GrapplingState(
        position_id="closed_guard_bottom",
        mode="no_gi",
        active_controls=owned_controls({"wrist_control"}),
    )

    transitions = simulator.get_available_transitions(state)

    assert [transition.id for transition in transitions] == [
        "closed_guard_bottom_arm_drag_to_back_control_top",
        "closed_guard_bottom_hip_bump_to_mount_top",
        "closed_guard_bottom_opponent_stand_open_to_open_guard_bottom",
    ]


def test_available_transitions_exclude_missing_required_grips(
    simulator: RollSimulator,
) -> None:
    state = GrapplingState(position_id="closed_guard_bottom", mode="gi")

    assert [
        transition.id
        for transition in simulator.get_available_transitions(state)
    ] == [
        "closed_guard_bottom_hip_bump_to_mount_top",
        "closed_guard_bottom_opponent_stand_open_to_open_guard_bottom",
    ]


def test_available_transitions_validate_complete_state(
    simulator: RollSimulator,
) -> None:
    state = GrapplingState(
        position_id="closed_guard_bottom",
        mode="gi",
        active_controls=owned_controls({"missing_grip"}),
    )

    with pytest.raises(KeyError, match="Unknown grip ID 'missing_grip'"):
        simulator.get_available_transitions(state)


def test_available_transitions_are_sorted_by_id() -> None:
    graph = _graph(
        [
            _transition("z_choice", "start", "right"),
            _transition("a_choice", "start", "left"),
        ]
    )

    transitions = RollSimulator(graph).get_available_transitions(_state())

    assert [transition.id for transition in transitions] == [
        "a_choice",
        "z_choice",
    ]


def test_random_step_selects_only_currently_valid_transitions(
    graph: GrapplingGraph,
    simulator: RollSimulator,
) -> None:
    state = GrapplingState(
        position_id="closed_guard_bottom",
        mode="gi",
        active_controls=owned_controls({"sleeve_grip", "wrist_control"}),
    )
    valid_ids = {
        transition.id
        for transition in simulator.get_available_actions(state)
    }

    for seed in range(10):
        result = simulator.random_step(state, rng=random.Random(seed))

        assert result is not None
        transition, next_state = result
        assert transition.id in valid_ids
        assert next_state == simulator.step(state, transition.id)


def test_random_step_is_repeatable_with_seeded_rng(
    simulator: RollSimulator,
) -> None:
    state = GrapplingState(
        position_id="closed_guard_bottom",
        mode="gi",
        active_controls=owned_controls({"sleeve_grip", "wrist_control"}),
    )

    first = simulator.random_step(state, rng=random.Random(27))
    second = simulator.random_step(state, rng=random.Random(27))

    assert first == second


def test_random_step_returns_none_at_dead_end(
    simulator: RollSimulator,
) -> None:
    state = GrapplingState(position_id="submission_terminal", mode="gi")

    assert simulator.random_step(state, rng=random.Random(1)) is None


def test_simulate_returns_valid_path_with_graph_produced_states() -> None:
    graph = _grip_sequence_graph()
    start = _state(active_control_ids={"initial_control"})

    path = RollSimulator(graph).simulate(
        start,
        max_steps=10,
        rng=random.Random(4),
    )

    assert isinstance(path, RollSimulation)
    assert len(path.states) == len(path.transition_ids) + 1
    for index, transition_id in enumerate(path.transition_ids):
        assert path.states[index + 1] == graph.apply_transition(
            path.states[index], transition_id
        )


def test_simulate_propagates_grip_changes_across_steps() -> None:
    graph = _grip_sequence_graph()
    start = _state(active_control_ids={"initial_control"})

    path = RollSimulator(graph).simulate(start, max_steps=10)

    assert path.transition_ids == ("create_next", "finish")
    assert path.states[0].active_controls == owned_controls({"initial_control"})
    assert path.states[1].active_controls == owned_controls({"next_control"})
    assert path.states[2].active_controls == frozenset()


def test_simulate_never_exceeds_max_steps() -> None:
    graph = _graph(
        [
            _transition("forward", "start", "middle"),
            _transition("back", "middle", "start"),
        ]
    )

    path = RollSimulator(graph).simulate(_state(), max_steps=3)

    assert path.step_count == 3
    assert len(path.states) == 4
    assert path.stop_reason == "max_steps"


def test_simulate_stops_at_dead_end() -> None:
    graph = _graph([_transition("only_step", "start", "middle")])

    path = RollSimulator(graph).simulate(_state(), max_steps=20)

    assert path.transition_ids == ("only_step",)
    assert [state.position_id for state in path.states] == ["start", "middle"]
    assert path.stop_reason == "no_available_transitions"


def test_simulate_stops_immediately_after_executed_submission() -> None:
    graph = _graph(
        [
            _transition(
                "armbar",
                "start",
                "submission_terminal",
                submission=True,
            )
        ]
    )

    result = RollSimulator(graph).simulate(_state(), max_steps=1)

    assert result.stop_reason == "submission"
    assert result.transition_ids == ("armbar",)
    assert result.states[-1].position_id == "submission_terminal"
    assert result.submission_transition == result.actions[-1]


def test_submission_precedes_max_steps_when_final_event_hits_limit() -> None:
    graph = _graph(
        [
            _transition(
                "armbar",
                "start",
                "submission_terminal",
                submission=True,
            )
        ]
    )

    result = RollSimulator(graph).simulate(_state(), max_steps=1)

    assert result.total_events == 1
    assert result.stop_reason == "submission"


def test_simulate_zero_steps_returns_only_validated_start_state() -> None:
    graph = _graph([], position_ids={"start"})
    start = _state()

    path = RollSimulator(graph).simulate(start, max_steps=0)

    assert path == RollSimulation(states=(start,), stop_reason="max_steps")


def test_simulate_zero_steps_still_rejects_invalid_start_state() -> None:
    graph = _graph([], position_ids={"start"})

    with pytest.raises(KeyError, match="Unknown position ID 'missing'"):
        RollSimulator(graph).simulate(
            _state(position_id="missing"),
            max_steps=0,
        )


def test_simulate_rejects_negative_max_steps() -> None:
    graph = _graph([], position_ids={"start"})

    with pytest.raises(ValueError, match="max_steps must be zero or greater"):
        RollSimulator(graph).simulate(_state(), max_steps=-1)


def test_seeded_simulations_are_repeatable() -> None:
    graph = _graph(
        [
            _transition("a_left", "start", "left"),
            _transition("b_right", "start", "right"),
            _transition("left_reset", "left", "start"),
            _transition("right_reset", "right", "start"),
        ]
    )
    simulator = RollSimulator(graph)

    first = simulator.simulate(_state(), max_steps=8, rng=random.Random(91))
    second = simulator.simulate(_state(), max_steps=8, rng=random.Random(91))

    assert first == second


def _grip_sequence_graph() -> GrapplingGraph:
    grips = {
        grip_id: _grip(grip_id)
        for grip_id in ("initial_control", "next_control")
    }
    return _graph(
        [
            _transition(
                "create_next",
                "start",
                "middle",
                required_grips=("initial_control",),
                created_grips=("next_control",),
                removed_grips=("initial_control",),
            ),
            _transition(
                "finish",
                "middle",
                "finish",
                required_grips=("next_control",),
                removed_grips=("next_control",),
            ),
        ],
        grips=grips,
    )


def _graph(
    transitions: list[Transition],
    *,
    position_ids: set[str] | None = None,
    grips: dict[str, Grip] | None = None,
) -> GrapplingGraph:
    all_position_ids = set(position_ids or {"start"})
    for transition in transitions:
        all_position_ids.update(
            (transition.from_position, transition.to_position)
        )
    positions = {
        position_id: _position(position_id)
        for position_id in all_position_ids
    }
    return GrapplingGraph(
        positions,
        {transition.id: transition for transition in transitions},
        grips or {},
    )


def _state(
    *,
    position_id: str = "start",
    active_control_ids: set[str] | None = None,
) -> GrapplingState:
    return GrapplingState(
        position_id=position_id,
        mode="gi",
        active_controls=owned_controls(active_control_ids or set()),
    )


def _position(position_id: str) -> Position:
    return Position(
        id=position_id,
        name=position_id.replace("_", " ").title(),
        category="test",
        player_role="test",
        gi_allowed=True,
        no_gi_allowed=True,
        terminal=position_id == "submission_terminal",
        description="Custom test position.",
    )


def _grip(grip_id: str) -> Grip:
    return Grip(
        id=grip_id,
        name=grip_id.replace("_", " ").title(),
        grip_type="control",
        gi_required=False,
        control_target="opponent",
        dominant_hand="either",
    )


def _transition(
    transition_id: str,
    from_position: str,
    to_position: str,
    *,
    required_grips: tuple[str, ...] = (),
    created_grips: tuple[str, ...] = (),
    removed_grips: tuple[str, ...] = (),
    submission: bool = False,
) -> Transition:
    return Transition(
        id=transition_id,
        name=transition_id.replace("_", " ").title(),
        from_position=from_position,
        to_position=to_position,
        transition_type="test",
        required_grips=list(required_grips),
        created_grips=list(created_grips),
        removed_grips=list(removed_grips),
        gi_allowed=True,
        no_gi_allowed=True,
        difficulty="beginner",
        submission=submission,
        terminal=submission,
    )
