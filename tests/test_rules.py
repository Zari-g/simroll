import pytest

from simroll.engine import (
    GrapplingGraph,
    GrapplingMode,
    is_transition_available,
)
from simroll.models import Transition


@pytest.fixture
def graph() -> GrapplingGraph:
    return GrapplingGraph.from_default_data()


@pytest.fixture
def flower_sweep(graph: GrapplingGraph) -> Transition:
    return graph.get_transition("flower_sweep")


@pytest.fixture
def hip_bump_sweep(graph: GrapplingGraph) -> Transition:
    return graph.get_transition("hip_bump_sweep")


def test_flower_sweep_is_available_in_gi_with_sleeve_grip(
    flower_sweep: Transition,
) -> None:
    assert is_transition_available(flower_sweep, "gi", ["sleeve_grip"])


def test_flower_sweep_is_unavailable_in_no_gi(
    flower_sweep: Transition,
) -> None:
    assert not is_transition_available(flower_sweep, "no_gi", ["sleeve_grip"])


def test_flower_sweep_is_unavailable_without_sleeve_grip(
    flower_sweep: Transition,
) -> None:
    assert not is_transition_available(flower_sweep, "gi", [])


@pytest.mark.parametrize("mode", ["gi", "no_gi"])
def test_hip_bump_sweep_is_available_in_both_modes_with_wrist_control(
    hip_bump_sweep: Transition,
    mode: GrapplingMode,
) -> None:
    assert is_transition_available(hip_bump_sweep, mode, ["wrist_control"])


def test_hip_bump_sweep_is_unavailable_without_wrist_control(
    hip_bump_sweep: Transition,
) -> None:
    assert not is_transition_available(hip_bump_sweep, "gi", [])


def test_extra_active_grips_do_not_block_a_transition(
    flower_sweep: Transition,
) -> None:
    active_grips = ["underhook", "sleeve_grip", "wrist_control"]

    assert is_transition_available(flower_sweep, "gi", active_grips)


def test_transition_without_required_grips_is_available_in_allowed_mode(
    graph: GrapplingGraph,
) -> None:
    elbow_escape = graph.get_transition("elbow_escape")

    assert is_transition_available(elbow_escape, "no_gi", [])


@pytest.mark.parametrize(
    ("mode", "active_grips", "expected_transition_ids"),
    [
        ("gi", ["sleeve_grip", "wrist_control"], ["flower_sweep", "hip_bump_sweep"]),
        ("gi", ["sleeve_grip"], ["flower_sweep"]),
        ("no_gi", ["wrist_control"], ["hip_bump_sweep"]),
        ("no_gi", [], []),
    ],
)
def test_get_available_transitions_filters_by_mode_and_grips(
    graph: GrapplingGraph,
    mode: GrapplingMode,
    active_grips: list[str],
    expected_transition_ids: list[str],
) -> None:
    transitions = graph.get_available_transitions(
        "closed_guard_bottom", mode, active_grips
    )

    assert [transition.id for transition in transitions] == expected_transition_ids


def test_get_available_transitions_rejects_unknown_position(
    graph: GrapplingGraph,
) -> None:
    with pytest.raises(KeyError, match="Unknown position ID 'missing_position'"):
        graph.get_available_transitions("missing_position", "gi", [])


def test_get_available_transitions_does_not_modify_active_grips(
    graph: GrapplingGraph,
) -> None:
    active_grips = ["sleeve_grip", "wrist_control"]
    original_active_grips = active_grips.copy()

    graph.get_available_transitions("closed_guard_bottom", "gi", active_grips)

    assert active_grips == original_active_grips


def test_get_available_transitions_does_not_modify_transitions(
    graph: GrapplingGraph,
) -> None:
    transitions = graph.get_transitions_from("closed_guard_bottom")
    original_transition_data = [transition.model_dump() for transition in transitions]

    graph.get_available_transitions(
        "closed_guard_bottom", "gi", ["sleeve_grip", "wrist_control"]
    )

    assert [transition.model_dump() for transition in transitions] == (
        original_transition_data
    )


def test_unsupported_mode_raises_clear_value_error(
    flower_sweep: Transition,
) -> None:
    with pytest.raises(
        ValueError, match="Unsupported grappling mode 'submission_only'"
    ):
        is_transition_available(
            flower_sweep,
            "submission_only",  # type: ignore[arg-type]
            ["sleeve_grip"],
        )


def test_get_available_transitions_rejects_unsupported_mode_without_outgoing_edges(
    graph: GrapplingGraph,
) -> None:
    with pytest.raises(
        ValueError, match="Unsupported grappling mode 'submission_only'"
    ):
        graph.get_available_transitions(
            "side_control_top",
            "submission_only",  # type: ignore[arg-type]
            [],
        )
