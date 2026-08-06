"""Rules for determining whether grappling transitions are available."""

from collections.abc import Collection

from simroll.models import GrapplingMode, Transition
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
    active_grips: Collection[str],
) -> bool:
    """Return whether a transition is allowed by the mode and active grips."""

    return is_transition_allowed_in_mode(transition, mode) and all(
        grip_id in active_grips for grip_id in transition.required_grips
    )
