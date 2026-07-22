"""Rules for determining whether grappling transitions are available."""

from collections.abc import Collection
from typing import Literal

from simroll.models import Transition

GrapplingMode = Literal["gi", "no_gi"]


def is_transition_available(
    transition: Transition,
    mode: GrapplingMode,
    active_grips: Collection[str],
) -> bool:
    """Return whether a transition is allowed by the mode and active grips."""

    if mode == "gi":
        mode_allowed = transition.gi_allowed
    elif mode == "no_gi":
        mode_allowed = transition.no_gi_allowed
    else:
        raise ValueError(
            f"Unsupported grappling mode {mode!r}; expected 'gi' or 'no_gi'."
        )

    return mode_allowed and all(
        grip_id in active_grips for grip_id in transition.required_grips
    )
