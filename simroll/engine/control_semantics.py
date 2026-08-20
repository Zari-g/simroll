"""Centralized owned-control requirement and lifecycle semantics."""

from collections.abc import Collection, Iterable, Mapping

from simroll.models import (
    ActiveControl,
    GrapplingMode,
    Grip,
    OwnedControlRequirement,
    PlayerId,
    Position,
    Transition,
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


def control_incompatibility_reason(
    control: ActiveControl,
    position: Position,
    mode: GrapplingMode,
    controls: Mapping[str, Grip],
) -> str | None:
    """Return why an owned control is invalid, or ``None`` when it is valid.

    Runtime positions explicitly model compatibility with ``allowed_controls``.
    Small custom/legacy fixtures that omit that field retain their historical
    mode-only behavior.
    """

    definition = controls.get(control.control_id)
    if definition is None:
        return "the control ID is unknown"

    if mode == "gi" and not definition.gi_allowed:
        return "the control is not allowed in gi mode"
    if mode == "no_gi" and (
        definition.category == "garment_grip"
        or definition.gi_required
        or not definition.no_gi_allowed
    ):
        return "garment controls are not allowed in no_gi mode"

    if (
        "allowed_controls" in position.model_fields_set
        and control.control_id not in position.allowed_controls
    ):
        return f"the control is not allowed in position '{position.id}'"

    owner_role = (
        position.player_a_role
        if control.owner == "player_a"
        else position.player_b_role
    )
    if not _owner_role_is_compatible(
        definition.owner_role_constraint, owner_role
    ):
        return (
            f"owner role '{owner_role}' does not satisfy "
            f"'{definition.owner_role_constraint}'"
        )
    return None


def control_is_compatible(
    control: ActiveControl,
    position: Position,
    mode: GrapplingMode,
    controls: Mapping[str, Grip],
) -> bool:
    """Return whether an owned control can exist at a position in a mode."""

    return control_incompatibility_reason(
        control, position, mode, controls
    ) is None


def apply_control_lifecycle(
    transition: Transition,
    active_controls: Collection[ActiveControl],
    destination: Position,
    mode: GrapplingMode,
    controls: Mapping[str, Grip],
    *,
    uses_runtime_schema: bool,
) -> frozenset[ActiveControl]:
    """Apply one transition's deterministic control effects.

    Reset happens first, followed by exact removals, exact additions,
    explicitly requested preservation, and destination/mode pruning. Explicit
    additions are rejected rather than silently discarded when invalid.
    Optional controls deliberately have no legality or acquisition effect.
    """

    if uses_runtime_schema:
        removed = frozenset(transition.removed_controls)
        added = frozenset(transition.created_controls)
        preserved = frozenset(transition.controls_preserved_if_valid)
        next_controls = set() if transition.reset_controls else set(active_controls)
    else:
        removed = owned_controls(transition.removed_grips)
        added = owned_controls(transition.created_grips)
        preserved = frozenset()
        next_controls = set(active_controls)

    next_controls.difference_update(removed)

    for control in sorted(added, key=_control_sort_key):
        reason = control_incompatibility_reason(
            control, destination, mode, controls
        )
        if reason is not None:
            raise ValueError(
                f"Transition '{transition.id}' cannot add control "
                f"'{control.control_id}' owned by {control.owner}: {reason}."
            )
        next_controls.add(control)

    next_controls.update(set(active_controls).intersection(preserved))
    return frozenset(
        control
        for control in next_controls
        if control_is_compatible(control, destination, mode, controls)
    )


def _owner_role_is_compatible(constraint: str, owner_role: str) -> bool:
    if constraint == "any_engaged_player":
        return True
    if constraint == "back_controller_or_top_rider":
        return owner_role in {"back_controller", "top_rider"}

    allowed_role_kinds = set(constraint.split("_or_"))
    if "top" in allowed_role_kinds and owner_role.startswith("top_"):
        return True
    if "controller" in allowed_role_kinds and "controller" in owner_role:
        return True
    if "guard_attacker" in allowed_role_kinds and owner_role == "bottom_guard":
        return True
    if "headlock_attacker" in allowed_role_kinds and owner_role == "headlock_attacker":
        return True
    return False


def _control_sort_key(control: ActiveControl) -> tuple[str, str, str]:
    return control.control_id, control.owner, control.target
