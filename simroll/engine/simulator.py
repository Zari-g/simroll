"""Random and user-directed roll simulation over the grappling graph."""

import random

from simroll.engine.graph import GrapplingGraph
from simroll.models import GrapplingPath, GrapplingState, Transition


class RollSimulator:
    """Orchestrate roll steps while leaving grappling rules to the graph."""

    def __init__(self, graph: GrapplingGraph) -> None:
        self._graph = graph

    def step(
        self,
        state: GrapplingState,
        transition_id: str,
    ) -> GrapplingState:
        """Apply one selected transition and return the resulting state."""

        return self._graph.apply_transition(state, transition_id)

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

    def random_step(
        self,
        state: GrapplingState,
        *,
        rng: random.Random | None = None,
    ) -> tuple[Transition, GrapplingState] | None:
        """Apply one random valid transition, or return ``None`` at a dead end."""

        transitions = self.get_available_transitions(state)
        if not transitions:
            return None

        generator = rng if rng is not None else random.Random()
        transition = generator.choice(transitions)
        next_state = self._graph.apply_transition(state, transition.id)
        return transition, next_state

    def simulate(
        self,
        start_state: GrapplingState,
        *,
        max_steps: int,
        rng: random.Random | None = None,
    ) -> GrapplingPath:
        """Simulate up to ``max_steps`` random transitions from a valid state."""

        if max_steps < 0:
            raise ValueError("max_steps must be zero or greater.")

        self._graph.validate_state(start_state)
        generator = rng if rng is not None else random.Random()
        states = [start_state]
        transition_ids: list[str] = []

        for _ in range(max_steps):
            result = self.random_step(states[-1], rng=generator)
            if result is None:
                break

            transition, next_state = result
            transition_ids.append(transition.id)
            states.append(next_state)

        return GrapplingPath(
            states=tuple(states),
            transition_ids=tuple(transition_ids),
        )
