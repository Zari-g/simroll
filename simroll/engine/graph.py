"""Directed graph representation of grappling positions and transitions."""

from collections.abc import Collection, Mapping
from types import MappingProxyType

import networkx as nx

from simroll.data import load_grips, load_positions, load_transitions
from simroll.engine.rules import (
    is_transition_allowed_in_mode,
    is_transition_available,
)
from simroll.models import (
    GrapplingMode,
    GrapplingState,
    Grip,
    Position,
    Transition,
)
from simroll.models.state import validate_grappling_mode


class GrapplingGraph:
    """A directed multigraph of grappling positions and transitions."""

    def __init__(
        self,
        positions: dict[str, Position],
        transitions: dict[str, Transition],
        grips: dict[str, Grip],
    ) -> None:
        self._positions = dict(positions)
        self._transitions = dict(transitions)
        self._grips = dict(grips)
        self._positions_view = MappingProxyType(self._positions)
        self._transitions_view = MappingProxyType(self._transitions)
        self._grips_view = MappingProxyType(self._grips)
        self._graph = nx.MultiDiGraph()

        for position_id, position in self._positions.items():
            self._graph.add_node(position_id, position=position)

        for transition in self._transitions.values():
            self._add_transition(transition)

    @classmethod
    def from_default_data(cls) -> "GrapplingGraph":
        """Build a graph from SimRoll's starter YAML data."""

        positions = load_positions()
        grips = load_grips()
        transitions = load_transitions(positions=positions, grips=grips)
        return cls(positions, transitions, grips)

    @property
    def positions(self) -> Mapping[str, Position]:
        """Positions in the graph, keyed by position ID."""

        return self._positions_view

    @property
    def transitions(self) -> Mapping[str, Transition]:
        """Transitions in the graph, keyed by transition ID."""

        return self._transitions_view

    @property
    def grips(self) -> Mapping[str, Grip]:
        """Grip definitions in the graph, keyed by grip ID."""

        return self._grips_view

    @property
    def graph(self) -> nx.MultiDiGraph:
        """The underlying directed multigraph."""

        return self._graph

    def get_position(self, position_id: str) -> Position:
        """Return a position by ID."""

        try:
            return self._positions[position_id]
        except KeyError:
            raise KeyError(f"Unknown position ID '{position_id}'.") from None

    def get_transition(self, transition_id: str) -> Transition:
        """Return a transition by ID."""

        try:
            return self._transitions[transition_id]
        except KeyError:
            raise KeyError(f"Unknown transition ID '{transition_id}'.") from None

    def get_grip(self, grip_id: str) -> Grip:
        """Return a grip by ID."""

        try:
            return self._grips[grip_id]
        except KeyError:
            raise KeyError(f"Unknown grip ID '{grip_id}'.") from None

    def get_transitions_from(self, position_id: str) -> list[Transition]:
        """Return transitions directly leaving a position."""

        self.get_position(position_id)
        return [
            transition
            for _, _, transition in self._graph.out_edges(
                position_id, data="transition"
            )
        ]

    def get_available_transitions(
        self,
        position_id: str,
        mode: GrapplingMode,
        active_grips: Collection[str],
    ) -> list[Transition]:
        """Return outgoing transitions allowed by the mode and active grips."""

        transitions = self.get_transitions_from(position_id)
        validated_mode = validate_grappling_mode(mode)

        return [
            transition
            for transition in transitions
            if is_transition_available(transition, validated_mode, active_grips)
        ]

    def validate_state(self, state: GrapplingState) -> None:
        """Validate a grappling state against this graph's definitions."""

        position = self.get_position(state.position_id)
        mode = validate_grappling_mode(state.mode)

        if mode == "gi" and not position.gi_allowed:
            raise ValueError(
                f"Position '{position.id}' is not allowed in gi mode."
            )
        if mode == "no_gi" and not position.no_gi_allowed:
            raise ValueError(
                f"Position '{position.id}' is not allowed in no_gi mode."
            )

        for grip_id in sorted(state.active_grips):
            grip = self.get_grip(grip_id)
            if mode == "no_gi" and grip.gi_required:
                raise ValueError(
                    f"Gi-required grip '{grip_id}' cannot be active in no_gi mode."
                )

    def apply_transition(
        self, state: GrapplingState, transition_id: str
    ) -> GrapplingState:
        """Apply an available transition and return a new grappling state."""

        transition = self.get_transition(transition_id)
        self.validate_state(state)

        if state.position_id != transition.from_position:
            raise ValueError(
                f"Transition '{transition.id}' starts at "
                f"'{transition.from_position}', but the state is at "
                f"'{state.position_id}'."
            )

        if not is_transition_allowed_in_mode(transition, state.mode):
            raise ValueError(
                f"Transition '{transition.id}' is not allowed in "
                f"{state.mode} mode."
            )

        missing_grips = sorted(
            set(transition.required_grips).difference(state.active_grips)
        )
        if missing_grips:
            missing_list = ", ".join(repr(grip_id) for grip_id in missing_grips)
            raise ValueError(
                f"Transition '{transition.id}' is missing required active "
                f"grips: {missing_list}."
            )

        next_grips = (
            state.active_grips.difference(transition.removed_grips).union(
                transition.created_grips
            )
        )
        next_state = GrapplingState(
            position_id=transition.to_position,
            mode=state.mode,
            active_grips=next_grips,
        )
        self.validate_state(next_state)
        return next_state

    def get_reachable_positions(self, position_id: str) -> list[Position]:
        """Return unique positions reachable through one transition."""

        self.get_position(position_id)
        return [
            self._positions[reachable_id]
            for reachable_id in self._graph.successors(position_id)
        ]

    def _add_transition(self, transition: Transition) -> None:
        for position_id in (transition.from_position, transition.to_position):
            if position_id not in self._positions:
                raise ValueError(
                    f"Transition '{transition.id}' references unknown position "
                    f"'{position_id}'."
                )

        for field_name in (
            "required_grips",
            "created_grips",
            "removed_grips",
        ):
            for grip_id in getattr(transition, field_name):
                if grip_id not in self._grips:
                    raise ValueError(
                        f"Transition '{transition.id}' references unknown "
                        f"grip '{grip_id}' in {field_name}."
                    )

        self._graph.add_edge(
            transition.from_position,
            transition.to_position,
            key=transition.id,
            transition=transition,
        )
