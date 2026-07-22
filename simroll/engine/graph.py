"""Directed graph representation of grappling positions and transitions."""

from collections.abc import Mapping
from types import MappingProxyType

import networkx as nx

from simroll.data import load_grips, load_positions, load_transitions
from simroll.models import Position, Transition


class GrapplingGraph:
    """A directed multigraph of grappling positions and transitions."""

    def __init__(
        self,
        positions: dict[str, Position],
        transitions: dict[str, Transition],
    ) -> None:
        self._positions = dict(positions)
        self._transitions = dict(transitions)
        self._positions_view = MappingProxyType(self._positions)
        self._transitions_view = MappingProxyType(self._transitions)
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
        return cls(positions, transitions)

    @property
    def positions(self) -> Mapping[str, Position]:
        """Positions in the graph, keyed by position ID."""

        return self._positions_view

    @property
    def transitions(self) -> Mapping[str, Transition]:
        """Transitions in the graph, keyed by transition ID."""

        return self._transitions_view

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

    def get_transitions_from(self, position_id: str) -> list[Transition]:
        """Return transitions directly leaving a position."""

        self.get_position(position_id)
        return [
            transition
            for _, _, transition in self._graph.out_edges(
                position_id, data="transition"
            )
        ]

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

        self._graph.add_edge(
            transition.from_position,
            transition.to_position,
            key=transition.id,
            transition=transition,
        )
