"""Directed graph representation of grappling positions and transitions."""

from collections.abc import Collection, Mapping
from types import MappingProxyType

import networkx as nx

from simroll.data import load_grips, load_positions, load_transitions
from simroll.engine.control_semantics import (
    apply_control_lifecycle,
    control_incompatibility_reason,
    owned_controls,
    requirement_is_satisfied,
)
from simroll.engine.rules import (
    is_transition_allowed_in_mode,
    is_transition_available,
)
from simroll.models import (
    ActiveControl,
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
        """Build a graph from SimRoll's curated MVP runtime YAML data."""

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
        active_controls: Collection[ActiveControl],
    ) -> list[Transition]:
        """Return outgoing transitions allowed by mode and owned controls."""

        transitions = self.get_transitions_from(position_id)
        validated_mode = validate_grappling_mode(mode)

        return [
            transition
            for transition in transitions
            if is_transition_available(
                transition, validated_mode, active_controls
            )
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

        for control in sorted(
            state.active_controls,
            key=lambda item: (item.control_id, item.owner, item.target),
        ):
            grip = self.get_grip(control.control_id)
            if mode == "no_gi" and grip.gi_required:
                raise ValueError(
                    f"Gi-required grip '{control.control_id}' cannot be active "
                    "in no_gi mode."
                )
            reason = control_incompatibility_reason(
                control, position, mode, self._grips
            )
            if reason is not None:
                raise ValueError(
                    f"Control '{control.control_id}' owned by {control.owner} "
                    f"is invalid: {reason}."
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

        missing_requirements = [
            requirement
            for requirement in transition.required_controls
            if not requirement_is_satisfied(
                requirement, state.mode, state.active_controls
            )
        ]
        if missing_requirements:
            missing_list = "; ".join(
                f"one of {list(requirement.control_ids)!r} owned by "
                f"{requirement.owner}"
                for requirement in missing_requirements
            )
            raise ValueError(
                f"Transition '{transition.id}' is missing required active "
                f"controls: {missing_list}."
            )

        legacy_required = owned_controls(transition.required_grips)
        if not transition.required_controls and not legacy_required.issubset(
            state.active_controls
        ):
            missing_controls = sorted(
                legacy_required.difference(state.active_controls),
                key=lambda item: (item.control_id, item.owner, item.target),
            )
            missing_list = ", ".join(
                f"{control.control_id!r} owned by {control.owner}"
                for control in missing_controls
            )
            raise ValueError(
                f"Transition '{transition.id}' is missing required active "
                f"controls: {missing_list}."
            )

        destination = self.get_position(transition.to_position)
        next_controls = apply_control_lifecycle(
            transition,
            state.active_controls,
            destination,
            state.mode,
            self._grips,
            uses_runtime_schema=_uses_runtime_control_schema(transition),
        )
        next_state = GrapplingState(
            position_id=transition.to_position,
            mode=state.mode,
            active_controls=next_controls,
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

        for requirement in transition.required_controls:
            for grip_id in requirement.control_ids:
                if grip_id not in self._grips:
                    raise ValueError(
                        f"Transition '{transition.id}' references unknown "
                        f"grip '{grip_id}' in required_controls."
                    )

        for field_name in (
            "created_controls",
            "removed_controls",
            "optional_controls",
            "controls_preserved_if_valid",
        ):
            for control in getattr(transition, field_name):
                if control.control_id not in self._grips:
                    raise ValueError(
                        f"Transition '{transition.id}' references unknown "
                        f"grip '{control.control_id}' in {field_name}."
                    )

        self._graph.add_edge(
            transition.from_position,
            transition.to_position,
            key=transition.id,
            transition=transition,
        )


def _uses_runtime_control_schema(transition: Transition) -> bool:
    """Distinguish normalized runtime records from legacy custom fixtures."""

    return bool(
        transition.required_controls
        or transition.created_controls
        or transition.removed_controls
        or transition.optional_controls
        or transition.controls_preserved_if_valid
        or transition.reset_controls
        or transition.control_owner_resolution
    )
