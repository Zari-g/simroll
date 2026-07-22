from pathlib import Path

import pytest

from simroll.data.loader import load_grips, load_positions, load_transitions
from simroll.models import Grip, Position, Transition


def test_starter_yaml_files_load_successfully() -> None:
    positions = load_positions()
    grips = load_grips()
    transitions = load_transitions(positions=positions, grips=grips)

    assert positions
    assert grips
    assert transitions


def test_loaded_values_are_model_instances() -> None:
    positions = load_positions()
    grips = load_grips()
    transitions = load_transitions(positions=positions, grips=grips)

    assert all(isinstance(position, Position) for position in positions.values())
    assert all(isinstance(grip, Grip) for grip in grips.values())
    assert all(
        isinstance(transition, Transition) for transition in transitions.values()
    )


def _load_transitions_for_duplicate_test(path: Path) -> dict[str, Transition]:
    return load_transitions(path, positions=_sample_positions(), grips=_sample_grips())


@pytest.mark.parametrize(
    ("loader", "yaml_text", "message"),
    [
        (
            load_positions,
            """
            - id: closed_guard_bottom
              name: Closed Guard Bottom
              category: guard
              player_role: bottom
              gi_allowed: true
              no_gi_allowed: true
              tags: []
              description: Bottom player controls the opponent.
            - id: closed_guard_bottom
              name: Closed Guard Duplicate
              category: guard
              player_role: bottom
              gi_allowed: true
              no_gi_allowed: true
              tags: []
              description: Duplicate position.
            """,
            "Duplicate position ID 'closed_guard_bottom'",
        ),
        (
            load_grips,
            """
            - id: sleeve_grip
              name: Sleeve Grip
              grip_type: sleeve
              gi_required: true
              control_target: arm
              dominant_hand: either
              tags: []
            - id: sleeve_grip
              name: Sleeve Grip Duplicate
              grip_type: sleeve
              gi_required: true
              control_target: arm
              dominant_hand: either
              tags: []
            """,
            "Duplicate grip ID 'sleeve_grip'",
        ),
        (
            _load_transitions_for_duplicate_test,
            """
            - id: flower_sweep
              name: Flower Sweep
              from_position: closed_guard_bottom
              to_position: mount_top
              transition_type: sweep
              required_grips: []
              created_grips: []
              removed_grips: []
              gi_allowed: true
              no_gi_allowed: true
              difficulty: beginner
              tags: []
              notes: First transition.
            - id: flower_sweep
              name: Flower Sweep Duplicate
              from_position: closed_guard_bottom
              to_position: mount_top
              transition_type: sweep
              required_grips: []
              created_grips: []
              removed_grips: []
              gi_allowed: true
              no_gi_allowed: true
              difficulty: beginner
              tags: []
              notes: Duplicate transition.
            """,
            "Duplicate transition ID 'flower_sweep'",
        ),
    ],
)
def test_duplicate_ids_are_rejected(
    tmp_path: Path, loader: object, yaml_text: str, message: str
) -> None:
    data_path = tmp_path / "data.yaml"
    data_path.write_text(yaml_text, encoding="utf-8")

    with pytest.raises(ValueError, match=message):
        loader(data_path)  # type: ignore[operator]


def test_invalid_position_reference_is_rejected(tmp_path: Path) -> None:
    transition_path = tmp_path / "transitions.yaml"
    transition_path.write_text(
        """
        - id: bad_transition
          name: Bad Transition
          from_position: missing_position
          to_position: mount_top
          transition_type: sweep
          required_grips: []
          created_grips: []
          removed_grips: []
          gi_allowed: true
          no_gi_allowed: true
          difficulty: beginner
          tags: []
          notes: References a missing position.
        """,
        encoding="utf-8",
    )

    with pytest.raises(
        ValueError,
        match=(
            "Transition 'bad_transition' references unknown position "
            "'missing_position' in from_position."
        ),
    ):
        load_transitions(
            transition_path,
            positions=_sample_positions(),
            grips=_sample_grips(),
        )


def test_invalid_grip_reference_is_rejected(tmp_path: Path) -> None:
    transition_path = tmp_path / "transitions.yaml"
    transition_path.write_text(
        """
        - id: bad_transition
          name: Bad Transition
          from_position: closed_guard_bottom
          to_position: mount_top
          transition_type: sweep
          required_grips:
            - missing_grip
          created_grips: []
          removed_grips: []
          gi_allowed: true
          no_gi_allowed: true
          difficulty: beginner
          tags: []
          notes: References a missing grip.
        """,
        encoding="utf-8",
    )

    with pytest.raises(
        ValueError,
        match=(
            "Transition 'bad_transition' references unknown grip "
            "'missing_grip' in required_grips."
        ),
    ):
        load_transitions(
            transition_path,
            positions=_sample_positions(),
            grips=_sample_grips(),
        )


def _sample_positions() -> dict[str, Position]:
    return {
        "closed_guard_bottom": Position(
            id="closed_guard_bottom",
            name="Closed Guard Bottom",
            category="guard",
            player_role="bottom",
            gi_allowed=True,
            no_gi_allowed=True,
            tags=[],
            description="Bottom closed guard.",
        ),
        "mount_top": Position(
            id="mount_top",
            name="Mount Top",
            category="dominant",
            player_role="top",
            gi_allowed=True,
            no_gi_allowed=True,
            tags=[],
            description="Top mount.",
        ),
    }


def _sample_grips() -> dict[str, Grip]:
    return {
        "sleeve_grip": Grip(
            id="sleeve_grip",
            name="Sleeve Grip",
            grip_type="sleeve",
            gi_required=True,
            control_target="arm",
            dominant_hand="either",
            tags=[],
        )
    }
