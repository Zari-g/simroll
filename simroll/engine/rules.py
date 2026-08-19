"""Rules for determining whether grappling transitions are available."""

from collections.abc import Collection

from simroll.engine.control_semantics import owned_controls, requirements_are_satisfied
from simroll.models import ActiveControl, GrapplingMode, Transition
from simroll.models.state import validate_grappling_mode


def is_transition_allowed_in_mode(
    transition: Transition, mode: GrapplingMode
) -> bool:
    """Return whether a transition supports the requested grappling mode."""

    validated_mode = validate_grappling_mode(mode)
    if validated_mode == "gi":
        return transition.gi_allowed
    return transition.no_gi_allowed


def is_transition_available(
    transition: Transition,
    mode: GrapplingMode,
    active_controls: Collection[ActiveControl],
) -> bool:
    """Return whether mode and owned-control requirements are satisfied."""

    if not is_transition_allowed_in_mode(transition, mode):
        return False
    if transition.required_controls:
        return requirements_are_satisfied(
            transition.required_controls, mode, active_controls
        )
    return owned_controls(transition.required_grips).issubset(active_controls)
