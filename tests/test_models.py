from simroll.models import Grip, Position, Transition


def test_position_creation() -> None:
    position = Position(
        id="closed_guard_bottom",
        name="Closed Guard Bottom",
        category="guard",
        player_role="bottom",
        gi_allowed=True,
        no_gi_allowed=True,
        tags=["guard", "bottom"],
        description="Bottom player controls the opponent with closed legs.",
    )

    assert position.id == "closed_guard_bottom"
    assert position.player_role == "bottom"


def test_grip_creation() -> None:
    grip = Grip(
        id="sleeve_grip",
        name="Sleeve Grip",
        grip_type="sleeve",
        gi_required=True,
        control_target="arm",
        dominant_hand="either",
        tags=["gi", "arm_control"],
    )

    assert grip.id == "sleeve_grip"
    assert grip.gi_required is True


def test_transition_creation() -> None:
    transition = Transition(
        id="flower_sweep",
        name="Flower Sweep",
        from_position="closed_guard_bottom",
        to_position="mount_top",
        transition_type="sweep",
        required_grips=["sleeve_grip"],
        created_grips=[],
        removed_grips=["sleeve_grip"],
        gi_allowed=True,
        no_gi_allowed=False,
        difficulty="beginner",
        tags=["sweep", "closed_guard"],
        notes="Uses sleeve control to reverse the top player.",
    )

    assert transition.from_position == "closed_guard_bottom"
    assert transition.required_grips == ["sleeve_grip"]
