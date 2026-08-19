"""Owned-control requirement semantics for runtime transitions."""

from collections.abc import Collection, Iterable

from simroll.models import (
    ActiveControl,
    GrapplingMode,
    OwnedControlRequirement,
    PlayerId,
)


def owned_controls(
    control_ids: Iterable[str],
    owner: PlayerId = "player_a",
) -> frozenset[ActiveControl]:
    """Build controls held by one stable player over the other player."""

    target: PlayerId = "player_b" if owner == "player_a" else "player_a"
    return frozenset(
        ActiveControl(control_id=control_id, owner=owner, target=target)
        for control_id in control_ids
    )


def requirement_is_satisfied(
    requirement: OwnedControlRequirement,
    mode: GrapplingMode,
    active_controls: Collection[ActiveControl],
) -> bool:
    """Return whether one applicable any-of requirement is satisfied."""

    if mode not in requirement.modes:
        return True
    return any(
        ActiveControl(
            control_id=control_id,
            owner=requirement.owner,
            target=requirement.target,
        )
        in active_controls
        for control_id in requirement.control_ids
    )


def requirements_are_satisfied(
    requirements: Collection[OwnedControlRequirement],
    mode: GrapplingMode,
    active_controls: Collection[ActiveControl],
) -> bool:
    """Return whether every requirement applicable to ``mode`` is satisfied."""

    return all(
        requirement_is_satisfied(requirement, mode, active_controls)
        for requirement in requirements
    )
