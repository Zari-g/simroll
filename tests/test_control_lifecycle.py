import pytest

from simroll.engine import GrapplingGraph, is_transition_available
from simroll.engine.control_semantics import apply_control_lifecycle
from simroll.models import (
    ActiveControl,
    GrapplingState,
    Grip,
    OwnedControlRequirement,
    Position,
    Transition,
)


def test_explicit_removal_matches_full_owned_identity() -> None:
    a_control = _control("underhook", "player_a")
    b_control = _control("underhook", "player_b")
    graph = _lifecycle_graph(
        removed_controls=[a_control],
        reset_controls=False,
    )

    result = graph.apply_transition(_state({a_control, b_control}), "move")

    assert result.active_controls == frozenset({b_control})


def test_explicit_creation_assigns_declared_owner_and_target() -> None:
    created = _control("underhook", "player_b")
    graph = _lifecycle_graph(created_controls=[created])

    result = graph.apply_transition(_state(), "move")

    assert result.active_controls == frozenset({created})


def test_preserved_control_survives_reset_when_destination_valid() -> None:
    control = _control("underhook", "player_a")
    graph = _lifecycle_graph(
        controls_preserved_if_valid=[control],
        reset_controls=True,
    )

    result = graph.apply_transition(_state({control}), "move")

    assert result.active_controls == frozenset({control})


def test_preserved_control_is_pruned_when_destination_invalid() -> None:
    control = _control("underhook", "player_a")
    graph = _lifecycle_graph(
        destination_controls=[],
        controls_preserved_if_valid=[control],
        reset_controls=True,
    )

    result = graph.apply_transition(_state({control}), "move")

    assert result.active_controls == frozenset()


def test_optional_controls_neither_block_nor_create_control() -> None:
    optional = _control("underhook", "player_a")
    graph = _lifecycle_graph(optional_controls=[optional])
    transition = graph.get_transition("move")

    assert is_transition_available(transition, "gi", [])
    assert graph.apply_transition(_state(), "move").active_controls == frozenset()


def test_required_controls_still_block_transition() -> None:
    requirement = OwnedControlRequirement(
        control_ids=("underhook",),
        owner="player_a",
        target="player_b",
        modes=("gi", "no_gi"),
    )
    graph = _lifecycle_graph(required_controls=[requirement])

    with pytest.raises(ValueError, match="missing required active controls"):
        graph.apply_transition(_state(), "move")


def test_no_gi_rejects_explicit_garment_control_creation() -> None:
    sleeve = _control("sleeve_grip", "player_a")
    graph = _lifecycle_graph(
        controls={
            "sleeve_grip": _grip(
                "sleeve_grip",
                category="garment_grip",
                gi_required=True,
                no_gi_allowed=False,
            )
        },
        source_controls=["sleeve_grip"],
        destination_controls=["sleeve_grip"],
        created_controls=[sleeve],
    )

    with pytest.raises(ValueError, match="cannot add control 'sleeve_grip'"):
        graph.apply_transition(_state(mode="no_gi"), "move")


def test_no_gi_garment_control_cannot_leak_through_preservation() -> None:
    sleeve = _control("sleeve_grip", "player_a")
    definition = _grip(
        "sleeve_grip",
        category="garment_grip",
        gi_required=True,
        no_gi_allowed=False,
    )
    transition = Transition(
        id="preserve",
        name="Preserve",
        from_position="start",
        to_position="finish",
        transition_type="test",
        controls_preserved_if_valid=[sleeve],
        reset_controls=True,
        gi_allowed=True,
        no_gi_allowed=True,
        difficulty="test",
    )

    result = apply_control_lifecycle(
        transition,
        {sleeve},
        _position("finish", ["sleeve_grip"]),
        "no_gi",
        {definition.id: definition},
        uses_runtime_schema=True,
    )

    assert result == frozenset()


def test_validate_state_rejects_destination_and_owner_role_incompatibility() -> None:
    graph = GrapplingGraph.from_default_data()
    state = GrapplingState(
        position_id="side_control_bottom",
        mode="gi",
        active_controls={_control("crossface", "player_a")},
    )

    with pytest.raises(ValueError, match="owner role 'bottom_pinned'"):
        graph.validate_state(state)


def test_representative_sweep_preserves_player_identity() -> None:
    graph = GrapplingGraph.from_default_data()
    underhook = _control("underhook", "player_a")
    leg = _control("leg_control", "player_a")
    start = GrapplingState(
        position_id="half_guard_bottom",
        mode="no_gi",
        active_controls={underhook, leg},
    )

    result = graph.apply_transition(
        start, "half_guard_bottom_old_school_sweep_to_side_control_top"
    )

    assert result.position_id == "side_control_top"
    assert result.active_controls == frozenset({underhook})
    graph.validate_state(result)
    assert hash(result)


def test_representative_pass_and_escape_clear_unlisted_controls() -> None:
    graph = GrapplingGraph.from_default_data()
    start = GrapplingState(
        position_id="side_control_top",
        mode="no_gi",
        active_controls={_control("underhook", "player_a")},
    )

    result = graph.apply_transition(
        start, "side_control_top_opponent_elbow_escape_to_closed_guard_top"
    )

    assert result.position_id == "closed_guard_top"
    assert result.active_controls == frozenset()
    graph.validate_state(result)


def _lifecycle_graph(
    *,
    controls: dict[str, Grip] | None = None,
    source_controls: list[str] | None = None,
    destination_controls: list[str] | None = None,
    **transition_fields: object,
) -> GrapplingGraph:
    definitions = controls or {"underhook": _grip("underhook")}
    source_allowed = source_controls if source_controls is not None else list(definitions)
    destination_allowed = (
        destination_controls
        if destination_controls is not None
        else list(definitions)
    )
    positions = {
        "start": _position("start", source_allowed),
        "finish": _position("finish", destination_allowed),
    }
    transition = Transition(
        id="move",
        name="Move",
        from_position="start",
        to_position="finish",
        transition_type="test",
        gi_allowed=True,
        no_gi_allowed=True,
        difficulty="test",
        control_owner_resolution="test fixture uses stable players",
        **transition_fields,
    )
    return GrapplingGraph(positions, {transition.id: transition}, definitions)


def _position(position_id: str, allowed_controls: list[str]) -> Position:
    return Position(
        id=position_id,
        name=position_id.title(),
        category="test",
        player_role="test",
        player_a_role="top_controller",
        player_b_role="bottom_pinned",
        gi_allowed=True,
        no_gi_allowed=True,
        description="Lifecycle test position.",
        allowed_controls=allowed_controls,
    )


def _grip(
    control_id: str,
    *,
    category: str = "body_control",
    gi_required: bool = False,
    no_gi_allowed: bool = True,
) -> Grip:
    return Grip(
        id=control_id,
        name=control_id.replace("_", " ").title(),
        grip_type="control",
        category=category,  # type: ignore[arg-type]
        gi_allowed=True,
        no_gi_allowed=no_gi_allowed,
        gi_required=gi_required,
        control_target="opponent",
        dominant_hand="either",
    )


def _control(control_id: str, owner: str) -> ActiveControl:
    target = "player_b" if owner == "player_a" else "player_a"
    return ActiveControl(
        control_id=control_id,
        owner=owner,  # type: ignore[arg-type]
        target=target,  # type: ignore[arg-type]
    )


def _state(
    controls: set[ActiveControl] | None = None,
    *,
    mode: str = "gi",
) -> GrapplingState:
    return GrapplingState(
        position_id="start",
        mode=mode,  # type: ignore[arg-type]
        active_controls=controls or set(),
    )
