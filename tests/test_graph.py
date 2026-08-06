import pytest

from simroll.data import load_positions, load_transitions
from simroll.engine import GrapplingGraph


@pytest.fixture
def graph() -> GrapplingGraph:
    return GrapplingGraph.from_default_data()


def test_default_graph_loads_successfully(graph: GrapplingGraph) -> None:
    assert graph.positions
    assert graph.transitions
    assert graph.grips


def test_every_loaded_position_becomes_a_node(graph: GrapplingGraph) -> None:
    positions = load_positions()

    assert set(graph.graph.nodes) == set(positions)
    for position_id, position in positions.items():
        assert graph.graph.nodes[position_id]["position"] == position


def test_every_loaded_transition_becomes_an_edge(graph: GrapplingGraph) -> None:
    transitions = load_transitions()

    assert graph.graph.number_of_edges() == len(transitions)
    for transition in transitions.values():
        edge_data = graph.graph.get_edge_data(
            transition.from_position,
            transition.to_position,
            key=transition.id,
        )
        assert edge_data is not None
        assert edge_data["transition"] == transition


def test_get_position_returns_correct_position(graph: GrapplingGraph) -> None:
    position = graph.get_position("closed_guard_bottom")

    assert position.id == "closed_guard_bottom"
    assert position.name == "Closed Guard Bottom"


def test_get_transition_returns_correct_transition(graph: GrapplingGraph) -> None:
    transition = graph.get_transition("flower_sweep")

    assert transition.id == "flower_sweep"
    assert transition.name == "Flower Sweep"


def test_get_grip_returns_correct_grip(graph: GrapplingGraph) -> None:
    grip = graph.get_grip("underhook")

    assert grip.id == "underhook"
    assert grip.gi_required is False


def test_grips_mapping_is_read_only(graph: GrapplingGraph) -> None:
    underhook = graph.get_grip("underhook")

    with pytest.raises(TypeError):
        graph.grips["copied_underhook"] = underhook  # type: ignore[index]


def test_closed_guard_bottom_returns_expected_transitions(
    graph: GrapplingGraph,
) -> None:
    transitions = graph.get_transitions_from("closed_guard_bottom")

    assert [transition.name for transition in transitions] == [
        "Flower Sweep",
        "Hip Bump Sweep",
    ]


def test_closed_guard_bottom_can_reach_mount_top(graph: GrapplingGraph) -> None:
    reachable_positions = graph.get_reachable_positions("closed_guard_bottom")

    assert "mount_top" in {position.id for position in reachable_positions}


def test_duplicate_destination_positions_are_removed(
    graph: GrapplingGraph,
) -> None:
    reachable_positions = graph.get_reachable_positions("closed_guard_bottom")

    assert [position.id for position in reachable_positions] == ["mount_top"]


@pytest.mark.parametrize("method_name", ["get_transitions_from", "get_reachable_positions"])
def test_unknown_position_ids_raise_clear_key_error(
    graph: GrapplingGraph, method_name: str
) -> None:
    method = getattr(graph, method_name)

    with pytest.raises(KeyError, match="Unknown position ID 'missing_position'"):
        method("missing_position")


def test_get_position_raises_clear_key_error(graph: GrapplingGraph) -> None:
    with pytest.raises(KeyError, match="Unknown position ID 'missing_position'"):
        graph.get_position("missing_position")


def test_unknown_transition_id_raises_clear_key_error(
    graph: GrapplingGraph,
) -> None:
    with pytest.raises(KeyError, match="Unknown transition ID 'missing_transition'"):
        graph.get_transition("missing_transition")


def test_unknown_grip_id_raises_clear_key_error(graph: GrapplingGraph) -> None:
    with pytest.raises(KeyError, match="Unknown grip ID 'missing_grip'"):
        graph.get_grip("missing_grip")


def test_valid_position_without_outgoing_transitions_returns_empty_list(
    graph: GrapplingGraph,
) -> None:
    assert graph.get_transitions_from("side_control_top") == []
