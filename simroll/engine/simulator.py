"""Random and user-directed roll simulation over the grappling graph."""

import random

from simroll.engine.graph import GrapplingGraph
from simroll.models import (
    ControlChange,
    GrapplingState,
    RollAction,
    RollSimulation,
    Transition,
)


class RollSimulator:
    """Orchestrate roll steps while leaving grappling rules to the graph."""

    def __init__(self, graph: GrapplingGraph) -> None:
        self._graph = graph

    def step(
        self,
        state: GrapplingState,
        action_id: str,
    ) -> GrapplingState:
        """Apply one selected transition and return the resulting state."""

        if action_id in self._graph.transitions:
            return self._graph.apply_transition(state, action_id)
        return self._graph.apply_control_change(state, action_id)

    def get_available_transitions(
        self,
        state: GrapplingState,
    ) -> list[Transition]:
        """Return valid transitions in deterministic transition-ID order."""

        self._graph.validate_state(state)
        transitions = self._graph.get_available_transitions(
            state.position_id,
            state.mode,
            state.active_controls,
        )
        return sorted(transitions, key=lambda transition: transition.id)

    def get_available_actions(self, state: GrapplingState) -> list[RollAction]:
        """Return positional and control actions in deterministic ID order."""

        transitions: list[RollAction] = self.get_available_transitions(state)
        actions = transitions + self._graph.get_available_control_changes(state)
        return sorted(actions, key=lambda action: action.id)

    def get_action(self, state: GrapplingState, action_id: str) -> RollAction:
        """Return one currently legal action by ID."""

        for action in self.get_available_actions(state):
            if action.id == action_id:
                return action
        if action_id in self._graph.transitions:
            return self._graph.get_transition(action_id)
        raise KeyError(f"Unknown or unavailable action ID '{action_id}'.")

    def random_step(
        self,
        state: GrapplingState,
        *,
        rng: random.Random | None = None,
        excluded_action_id: str | None = None,
    ) -> tuple[RollAction, GrapplingState] | None:
        """Apply one random valid action, or return ``None`` at a dead end."""

        actions = [
            action
            for action in self.get_available_actions(state)
            if action.id != excluded_action_id
        ]
        if not actions:
            return None

        generator = rng if rng is not None else random.Random()
        action = generator.choice(actions)
        next_state = self.step(state, action.id)
        return action, next_state

    def simulate(
        self,
        start_state: GrapplingState,
        *,
        max_steps: int,
        rng: random.Random | None = None,
    ) -> RollSimulation:
        """Simulate up to ``max_steps`` random positional/control events."""

        if max_steps < 0:
            raise ValueError("max_steps must be zero or greater.")

        self._graph.validate_state(start_state)
        generator = rng if rng is not None else random.Random()
        states = [start_state]
        actions: list[RollAction] = []
        previous_control_action_id: str | None = None
        stop_reason = "max_steps"

        for _ in range(max_steps):
            result = self.random_step(
                states[-1],
                rng=generator,
                excluded_action_id=previous_control_action_id,
            )
            if result is None:
                stop_reason = "no_available_transitions"
                break

            action, next_state = result
            actions.append(action)
            states.append(next_state)
            previous_control_action_id = (
                action.id if isinstance(action, ControlChange) else None
            )
            if (
                isinstance(action, Transition)
                and action.submission
                and next_state.position_id == "submission_terminal"
            ):
                stop_reason = "submission"
                break

        return RollSimulation(
            states=tuple(states),
            actions=tuple(actions),
            stop_reason=stop_reason,
        )
