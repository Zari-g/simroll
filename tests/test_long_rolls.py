import random
from pathlib import Path

import pytest

from simroll.datasets.importer import load_normalized_dataset
from simroll.engine import GrapplingGraph, RollSimulator
from simroll.models import ActiveControl, GrapplingState


NORMALIZED_PATH = Path("data/generated/simroll_bjj_mvp.normalized.json")


def _parse_controls(value: str) -> frozenset[ActiveControl]:
    if value == "none":
        return frozenset()
    controls = []
    for item in value.split("; "):
        owner, binding = item.split(":", maxsplit=1)
        control_id, target = binding.split(">", maxsplit=1)
        controls.append(
            ActiveControl(control_id=control_id, owner=owner, target=target)
        )
    return frozenset(controls)


@pytest.mark.parametrize(
    "sequence_id",
    [
        "gi_roll_01",
        "gi_roll_02",
        "gi_roll_03",
        "gi_roll_04",
        "gi_roll_05",
        "nogi_roll_01",
        "nogi_roll_02",
        "nogi_roll_03",
        "nogi_roll_04",
        "nogi_roll_05",
    ],
)
def test_normalized_example_roll_executes_exactly(sequence_id: str) -> None:
    dataset = load_normalized_dataset(NORMALIZED_PATH)
    example = next(
        item for item in dataset.example_rolls if item.sequence_id == sequence_id
    )
    graph = GrapplingGraph.from_default_data()
    simulator = RollSimulator(graph)
    state = GrapplingState(position_id=example.start_position, mode=example.mode)
    positional_steps = 0
    control_actions = 0

    for step in example.steps:
        expected_before = _parse_controls(step.active_controls_before)
        expected_after = _parse_controls(step.resulting_controls)
        assert state.position_id == step.position_before
        assert state.active_controls == expected_before
        graph.validate_state(state)

        if step.counts_as_positional_transition:
            legal = {
                transition.id: transition
                for transition in simulator.get_available_transitions(state)
            }
            assert step.transition_id in legal
            action = legal[step.transition_id]
            next_state = simulator.step(state, action.id)
            positional_steps += 1
        else:
            matches = []
            for action in simulator.get_available_actions(state):
                if (
                    action.action_type != "control_change"
                    or action.template_id != step.transition_id
                    or action.actor_player != step.player_performing
                ):
                    continue
                candidate = simulator.step(state, action.id)
                if (
                    candidate.position_id == step.resulting_position
                    and candidate.active_controls == expected_after
                ):
                    matches.append((action, candidate))
            assert len(matches) == 1
            action, next_state = matches[0]
            control_actions += 1

        assert action.actor_player == step.player_performing
        assert next_state.mode == state.mode == example.mode
        assert next_state.position_id == step.resulting_position
        assert next_state.active_controls == expected_after
        assert all(
            control.owner in {"player_a", "player_b"}
            and control.target in {"player_a", "player_b"}
            and control.owner != control.target
            for control in next_state.active_controls
        )
        graph.validate_state(next_state)
        state = next_state

    assert positional_steps == example.positional_transition_count
    assert control_actions == example.control_change_count
    assert len(example.steps) == example.total_step_count
    assert positional_steps >= 10
    assert state.position_id == example.final_position
    assert example.ended_in_submission == (
        state.position_id == "submission_terminal"
    )
    if example.ended_in_submission:
        assert action.action_type == "transition"
        assert action.submission


@pytest.mark.parametrize(
    ("mode", "position_id", "seed"),
    [
        ("gi", "standing_neutral", 7),
        ("gi", "closed_guard_bottom", 19),
        ("gi", "front_headlock_top", 5),
        ("no_gi", "standing_neutral", 7),
        ("no_gi", "closed_guard_bottom", 19),
        ("no_gi", "front_headlock_top", 0),
    ],
)
def test_seeded_simulations_are_deterministic_and_legal(
    mode: str, position_id: str, seed: int
) -> None:
    graph = GrapplingGraph.from_default_data()
    simulator = RollSimulator(graph)
    start = GrapplingState(position_id=position_id, mode=mode)

    first = simulator.simulate(start, max_steps=30, rng=random.Random(seed))
    second = simulator.simulate(start, max_steps=30, rng=random.Random(seed))

    assert first == second
    assert first.total_events <= 30
    assert first.control_actions <= first.total_events
    assert first.total_events == first.positional_steps + first.control_actions
    assert len(first.states) == first.total_events + 1
    for index, action in enumerate(first.actions):
        graph.validate_state(first.states[index])
        assert simulator.step(first.states[index], action.id) == first.states[index + 1]
    graph.validate_state(first.states[-1])
    if first.stop_reason == "submission":
        assert first.actions[-1].action_type == "transition"
        assert first.actions[-1].submission
        assert first.states[-1].position_id == "submission_terminal"


@pytest.mark.parametrize(
    ("mode", "seed"),
    [("gi", 5), ("no_gi", 0)],
)
def test_seeded_engine_can_produce_ten_positional_steps(
    mode: str, seed: int
) -> None:
    simulator = RollSimulator(GrapplingGraph.from_default_data())

    result = simulator.simulate(
        GrapplingState(position_id="front_headlock_top", mode=mode),
        max_steps=140,
        rng=random.Random(seed),
    )

    assert result.positional_steps >= 10
    assert result.total_events == result.positional_steps + result.control_actions
