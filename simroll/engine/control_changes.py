"""Instantiation and execution of same-position control-change templates."""

from collections.abc import Mapping

from simroll.engine.control_semantics import control_incompatibility_reason
from simroll.models import (
    ActiveControl,
    ControlChange,
    ControlChangeTemplate,
    GrapplingState,
    Grip,
    PlayerId,
    Position,
)


def generate_control_changes(
    state: GrapplingState,
    position: Position,
    controls: Mapping[str, Grip],
    templates: Mapping[str, ControlChangeTemplate],
) -> list[ControlChange]:
    """Resolve template parameters into only the actions legal in ``state``."""

    if position.terminal:
        return []

    actions: list[ControlChange] = []
    for template in sorted(templates.values(), key=lambda item: item.id):
        if state.mode not in template.compatible_modes:
            continue
        for actor in ("player_a", "player_b"):
            actions.extend(
                _instantiate_for_actor(template, actor, state, position, controls)
            )
    return sorted(actions, key=lambda action: action.id)


def apply_control_change(
    state: GrapplingState,
    action: ControlChange,
    position: Position,
    controls: Mapping[str, Grip],
) -> GrapplingState:
    """Apply validated removal/addition effects without positional movement."""

    if action.position_id != state.position_id:
        raise ValueError(
            f"Control change '{action.id}' applies at '{action.position_id}', "
            f"but the state is at '{state.position_id}'."
        )
    if action.mode != state.mode:
        raise ValueError(
            f"Control change '{action.id}' applies in {action.mode} mode, "
            f"but the state is in {state.mode} mode."
        )
    missing = set(action.required_controls).difference(state.active_controls)
    if missing:
        raise ValueError(f"Control change '{action.id}' is missing required controls.")

    next_controls = set(state.active_controls)
    next_controls.difference_update(action.removed_controls)
    for control in action.created_controls:
        if control in next_controls:
            raise ValueError(
                f"Control change '{action.id}' would duplicate an active control."
            )
        reason = control_incompatibility_reason(control, position, state.mode, controls)
        if reason is not None:
            raise ValueError(
                f"Control change '{action.id}' cannot add control "
                f"'{control.control_id}' owned by {control.owner}: {reason}."
            )
        next_controls.add(control)

    next_controls = {
        control
        for control in next_controls
        if control_incompatibility_reason(control, position, state.mode, controls)
        is None
    }
    return GrapplingState(
        position_id=state.position_id,
        mode=state.mode,
        active_controls=frozenset(next_controls),
    )


def _instantiate_for_actor(
    template: ControlChangeTemplate,
    actor: PlayerId,
    state: GrapplingState,
    position: Position,
    controls: Mapping[str, Grip],
) -> list[ControlChange]:
    target: PlayerId = "player_b" if actor == "player_a" else "player_a"
    owned = {
        control.control_id: control
        for control in state.active_controls
        if control.owner == actor and control.target == target
    }
    parameter_ids = tuple(sorted(template.parameter_control_ids))

    if template.id == "release_control":
        return [
            _action(template, actor, state, controls, removed=(owned[control_id],), required=(owned[control_id],))
            for control_id in parameter_ids
            if control_id in owned
        ]

    if template.id == "switch_control":
        actions: list[ControlChange] = []
        for from_id in parameter_ids:
            if from_id not in owned:
                continue
            for to_id in parameter_ids:
                candidate = ActiveControl(control_id=to_id, owner=actor, target=target)
                if to_id == from_id or candidate in state.active_controls:
                    continue
                if control_incompatibility_reason(candidate, position, state.mode, controls):
                    continue
                actions.append(
                    _action(
                        template,
                        actor,
                        state,
                        controls,
                        created=(candidate,),
                        removed=(owned[from_id],),
                        required=(owned[from_id],),
                    )
                )
        return actions

    actions = []
    for control_id in parameter_ids:
        candidate = ActiveControl(control_id=control_id, owner=actor, target=target)
        if candidate in state.active_controls:
            continue
        if control_incompatibility_reason(candidate, position, state.mode, controls):
            continue
        actions.append(
            _action(template, actor, state, controls, created=(candidate,))
        )
    return actions


def _action(
    template: ControlChangeTemplate,
    actor: PlayerId,
    state: GrapplingState,
    controls: Mapping[str, Grip],
    *,
    created: tuple[ActiveControl, ...] = (),
    removed: tuple[ActiveControl, ...] = (),
    required: tuple[ActiveControl, ...] = (),
) -> ControlChange:
    parameter_ids = [control.control_id for control in (*removed, *created)]
    action_id = ":".join((template.id, actor, *parameter_ids))
    control_names = [controls[control_id].name for control_id in parameter_ids]
    suffix = " → ".join(control_names) if control_names else ""
    return ControlChange(
        id=action_id,
        name=f"{template.display_name}: {suffix}",
        template_id=template.id,
        position_id=state.position_id,
        mode=state.mode,
        actor_player=actor,
        required_controls=required,
        created_controls=created,
        removed_controls=removed,
    )
