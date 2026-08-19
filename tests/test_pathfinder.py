from collections.abc import Iterable

import pytest

from simroll.engine import GrapplingGraph, GrapplingPathfinder
from simroll.engine.control_semantics import owned_controls
from simroll.models import GrapplingState, Grip, Position, Transition


def test_find_shortest_path_returns_direct_path() -> None:
    graph = _graph([_transition("direct", "start", "target")])

    path = GrapplingPathfinder(graph).find_shortest_path(
        _state(), "target"
    )

    assert path is not None
    assert path.transition_ids == ("direct",)
    assert path.step_count == 1
    assert path.final_state.position_id == "target"


def test_find_shortest_path_returns_multi_step_path() -> None:
    graph = _graph(
        [
            _transition("first", "start", "middle"),
            _transition("second", "middle", "target"),
        ]
    )

    path = GrapplingPathfinder(graph).find_shortest_path(
        _state(), "target"
    )

    assert path is not None
    assert path.transition_ids == ("first", "second")
    assert [state.position_id for state in path.states] == [
        "start",
        "middle",
        "target",
    ]


def test_find_shortest_path_prefers_shorter_route() -> None:
    graph = _graph(
        [
            _transition("a_detour", "start", "middle"),
            _transition("b_finish", "middle", "target"),
            _transition("z_direct", "start", "target"),
        ]
    )

    path = GrapplingPathfinder(graph).find_shortest_path(
        _state(), "target"
    )

    assert path is not None
    assert path.transition_ids == ("z_direct",)


def test_find_shortest_path_returns_zero_step_path_at_target() -> None:
    graph = _graph([], position_ids={"start"})
    start = _state()

    path = GrapplingPathfinder(graph).find_shortest_path(start, "start")

    assert path is not None
    assert path.states == (start,)
    assert path.transition_ids == ()


def test_find_shortest_path_returns_none_without_route() -> None:
    graph = _graph([], position_ids={"start", "target"})

    path = GrapplingPathfinder(graph).find_shortest_path(
        _state(), "target"
    )

    assert path is None


def test_find_shortest_path_rejects_unknown_target() -> None:
    graph = _graph([], position_ids={"start"})

    with pytest.raises(KeyError, match="Unknown position ID 'missing'"):
        GrapplingPathfinder(graph).find_shortest_path(_state(), "missing")


def test_find_shortest_path_rejects_invalid_start_state() -> None:
    graph = _graph([], position_ids={"start", "target"})
    invalid_start = _state(position_id="missing")

    with pytest.raises(KeyError, match="Unknown position ID 'missing'"):
        GrapplingPathfinder(graph).find_shortest_path(
            invalid_start, "target"
        )


def test_find_shortest_path_rejects_negative_max_depth() -> None:
    graph = _graph([], position_ids={"start", "target"})

    with pytest.raises(ValueError, match="max_depth must be zero or greater"):
        GrapplingPathfinder(graph).find_shortest_path(
            _state(), "target", max_depth=-1
        )


def test_find_shortest_path_max_depth_zero_prevents_expansion() -> None:
    graph = _graph([_transition("direct", "start", "target")])

    path = GrapplingPathfinder(graph).find_shortest_path(
        _state(), "target", max_depth=0
    )

    assert path is None


def test_find_shortest_path_rejects_route_beyond_max_depth() -> None:
    graph = _graph(
        [
            _transition("first", "start", "middle"),
            _transition("second", "middle", "target"),
        ]
    )

    path = GrapplingPathfinder(graph).find_shortest_path(
        _state(), "target", max_depth=1
    )

    assert path is None


def test_find_shortest_path_is_deterministic_for_equal_routes() -> None:
    graph = _graph(
        [
            _transition("z_direct", "start", "target"),
            _transition("a_direct", "start", "target"),
        ]
    )
    pathfinder = GrapplingPathfinder(graph)

    paths = [pathfinder.find_shortest_path(_state(), "target") for _ in range(3)]

    assert all(path is not None for path in paths)
    assert [path.transition_ids for path in paths if path is not None] == [
        ("a_direct",),
        ("a_direct",),
        ("a_direct",),
    ]


def test_shortest_path_uses_created_grip_for_later_transition() -> None:
    grip = _grip("control")
    graph = _graph(
        [
            _transition(
                "create_control",
                "start",
                "middle",
                created_grips=("control",),
            ),
            _transition(
                "use_control",
                "middle",
                "target",
                required_grips=("control",),
            ),
        ],
        grips={grip.id: grip},
    )

    path = GrapplingPathfinder(graph).find_shortest_path(
        _state(), "target"
    )

    assert path is not None
    assert path.transition_ids == ("create_control", "use_control")
    assert path.states[1].active_controls == owned_controls({"control"})


def test_shortest_path_distinguishes_same_position_with_different_grips() -> None:
    grip = _grip("setup_grip")
    graph = _graph(
        [
            _transition(
                "setup",
                "start",
                "start",
                created_grips=("setup_grip",),
            ),
            _transition(
                "technique",
                "start",
                "target",
                required_grips=("setup_grip",),
            ),
        ],
        grips={grip.id: grip},
    )

    path = GrapplingPathfinder(graph).find_shortest_path(
        _state(), "target"
    )

    assert path is not None
    assert path.transition_ids == ("setup", "technique")
    assert path.states[0].position_id == path.states[1].position_id
    assert path.states[0].active_controls == frozenset()
    assert path.states[1].active_controls == owned_controls({"setup_grip"})


def test_shortest_path_respects_gi_and_no_gi_transition_rules() -> None:
    graph = _graph(
        [
            _transition(
                "gi_only",
                "start",
                "target",
                no_gi_allowed=False,
            )
        ]
    )
    pathfinder = GrapplingPathfinder(graph)

    assert pathfinder.find_shortest_path(
        _state(mode="no_gi"), "target"
    ) is None
    assert pathfinder.find_shortest_path(
        _state(mode="gi"), "target"
    ) is not None


def test_shortest_path_rejects_gi_required_grip_in_no_gi_start() -> None:
    sleeve_grip = _grip("sleeve_grip", gi_required=True)
    graph = _graph(
        [],
        position_ids={"start", "target"},
        grips={sleeve_grip.id: sleeve_grip},
    )

    with pytest.raises(
        ValueError,
        match="Gi-required grip 'sleeve_grip' cannot be active in no_gi mode",
    ):
        GrapplingPathfinder(graph).find_shortest_path(
            _state(mode="no_gi", active_control_ids=("sleeve_grip",)),
            "target",
        )


def test_grip_removal_blocks_later_transition() -> None:
    control = _grip("control")
    graph = _graph(
        [
            _transition(
                "lose_control",
                "start",
                "middle",
                required_grips=("control",),
                removed_grips=("control",),
            ),
            _transition(
                "needs_control",
                "middle",
                "target",
                required_grips=("control",),
            ),
        ],
        grips={control.id: control},
    )
    start = _state(active_control_ids=("control",))

    path = GrapplingPathfinder(graph).find_shortest_path(start, "target")

    assert path is None
    assert start.active_controls == owned_controls({"control"})


def test_path_states_exactly_match_graph_transition_execution() -> None:
    control = _grip("control")
    graph = _graph(
        [
            _transition(
                "create_control",
                "start",
                "middle",
                created_grips=("control",),
            ),
            _transition(
                "remove_control",
                "middle",
                "target",
                removed_grips=("control",),
            ),
        ],
        grips={control.id: control},
    )
    start = _state()

    path = GrapplingPathfinder(graph).find_shortest_path(start, "target")
    after_first = graph.apply_transition(start, "create_control")
    after_second = graph.apply_transition(after_first, "remove_control")

    assert path is not None
    assert path.states == (start, after_first, after_second)


def test_difficulty_filter_allows_matching_route() -> None:
    graph = _filter_graph()

    path = GrapplingPathfinder(graph).find_shortest_path(
        _state(), "target", difficulties={"beginner"}
    )

    assert path is not None
    assert path.transition_ids == ("beginner_sweep",)


def test_difficulty_filter_blocks_nonmatching_route() -> None:
    graph = _graph(
        [
            _transition(
                "advanced_route",
                "start",
                "target",
                difficulty="advanced",
            )
        ]
    )

    path = GrapplingPathfinder(graph).find_shortest_path(
        _state(), "target", difficulties={"beginner"}
    )

    assert path is None


def test_transition_type_filter_allows_matching_route() -> None:
    graph = _filter_graph()

    path = GrapplingPathfinder(graph).find_shortest_path(
        _state(), "target", transition_types={"sweep"}
    )

    assert path is not None
    assert path.transition_ids == ("beginner_sweep",)


def test_transition_type_filter_blocks_nonmatching_route() -> None:
    graph = _graph(
        [
            _transition(
                "escape_route",
                "start",
                "target",
                transition_type="escape",
            )
        ]
    )

    path = GrapplingPathfinder(graph).find_shortest_path(
        _state(), "target", transition_types={"sweep"}
    )

    assert path is None


def test_combined_filters_require_both_values_to_match() -> None:
    graph = _filter_graph()
    pathfinder = GrapplingPathfinder(graph)

    matching = pathfinder.find_shortest_path(
        _state(),
        "target",
        difficulties={"advanced"},
        transition_types={"escape"},
    )
    blocked = pathfinder.find_shortest_path(
        _state(),
        "target",
        difficulties={"advanced"},
        transition_types={"sweep"},
    )

    assert matching is not None
    assert matching.transition_ids == ("advanced_escape",)
    assert blocked is None


@pytest.mark.parametrize(
    "filters",
    [
        {"difficulties": set()},
        {"transition_types": set()},
    ],
)
def test_empty_filter_collection_blocks_all_transitions(
    filters: dict[str, set[str]],
) -> None:
    graph = _filter_graph()

    path = GrapplingPathfinder(graph).find_shortest_path(
        _state(), "target", **filters
    )

    assert path is None


def test_filter_collections_are_not_mutated() -> None:
    graph = _filter_graph()
    pathfinder = GrapplingPathfinder(graph)
    difficulties = ["beginner", "beginner"]
    transition_types = ["sweep"]
    original_difficulties = difficulties.copy()
    original_transition_types = transition_types.copy()

    pathfinder.find_shortest_path(
        _state(),
        "target",
        difficulties=difficulties,
        transition_types=transition_types,
    )
    pathfinder.find_paths(
        _state(),
        "target",
        difficulties=difficulties,
        transition_types=transition_types,
    )

    assert difficulties == original_difficulties
    assert transition_types == original_transition_types


def test_find_paths_returns_alternatives_ordered_by_step_count() -> None:
    graph = _multiple_paths_graph()

    paths = GrapplingPathfinder(graph).find_paths(_state(), "target")

    assert [path.transition_ids for path in paths] == [
        ("direct",),
        ("to_middle_a", "finish_a"),
        ("to_middle_b", "finish_b"),
    ]
    assert [path.step_count for path in paths] == [1, 2, 2]


def test_find_paths_respects_max_paths() -> None:
    graph = _multiple_paths_graph()

    paths = GrapplingPathfinder(graph).find_paths(
        _state(), "target", max_paths=2
    )

    assert len(paths) == 2
    assert [path.step_count for path in paths] == [1, 2]


def test_find_paths_respects_max_depth() -> None:
    graph = _graph(
        [
            _transition("first", "start", "middle"),
            _transition("second", "middle", "target"),
        ]
    )

    paths = GrapplingPathfinder(graph).find_paths(
        _state(), "target", max_depth=1
    )

    assert paths == []


def test_find_paths_does_not_return_duplicate_transition_sequences() -> None:
    graph = _multiple_paths_graph()

    paths = GrapplingPathfinder(graph).find_paths(_state(), "target")
    transition_sequences = [path.transition_ids for path in paths]

    assert len(transition_sequences) == len(set(transition_sequences))


def test_find_paths_prevents_exact_state_cycles() -> None:
    graph = _graph(
        [
            _transition("to_middle", "start", "middle"),
            _transition("back_to_start", "middle", "start"),
            _transition("finish", "middle", "target"),
        ]
    )

    paths = GrapplingPathfinder(graph).find_paths(
        _state(), "target", max_depth=6
    )

    assert [path.transition_ids for path in paths] == [
        ("to_middle", "finish")
    ]


def test_find_paths_preserves_alternatives_that_converge_on_same_state() -> None:
    graph = _graph(
        [
            _transition("route_a", "start", "middle"),
            _transition("route_b", "start", "middle"),
            _transition("finish", "middle", "target"),
        ]
    )

    paths = GrapplingPathfinder(graph).find_paths(_state(), "target")

    assert [path.transition_ids for path in paths] == [
        ("route_a", "finish"),
        ("route_b", "finish"),
    ]


def test_find_paths_returns_zero_step_path_at_target() -> None:
    graph = _graph([], position_ids={"start"})
    start = _state()

    paths = GrapplingPathfinder(graph).find_paths(
        start, "start", max_depth=0
    )

    assert len(paths) == 1
    assert paths[0].states == (start,)
    assert paths[0].transition_ids == ()


def test_find_paths_returns_empty_list_without_route() -> None:
    graph = _graph([], position_ids={"start", "target"})

    paths = GrapplingPathfinder(graph).find_paths(_state(), "target")

    assert paths == []


@pytest.mark.parametrize("max_paths", [0, -1])
def test_find_paths_rejects_nonpositive_max_paths(max_paths: int) -> None:
    graph = _graph([], position_ids={"start", "target"})

    with pytest.raises(ValueError, match="max_paths must be greater than zero"):
        GrapplingPathfinder(graph).find_paths(
            _state(), "target", max_paths=max_paths
        )


def test_find_paths_rejects_negative_max_depth() -> None:
    graph = _graph([], position_ids={"start", "target"})

    with pytest.raises(ValueError, match="max_depth must be zero or greater"):
        GrapplingPathfinder(graph).find_paths(
            _state(), "target", max_depth=-1
        )


def test_find_paths_applies_transition_filters() -> None:
    graph = _filter_graph()

    paths = GrapplingPathfinder(graph).find_paths(
        _state(),
        "target",
        difficulties={"beginner"},
        transition_types={"sweep"},
    )

    assert [path.transition_ids for path in paths] == [
        ("beginner_sweep",)
    ]


def test_default_graph_finds_hip_bump_sweep() -> None:
    graph = GrapplingGraph.from_default_data()
    start = GrapplingState(
        position_id="closed_guard_bottom",
        mode="gi",
        active_controls=owned_controls(["wrist_control"]),
    )

    path = GrapplingPathfinder(graph).find_shortest_path(start, "mount_top")

    assert path is not None
    assert path.transition_ids == (
        "closed_guard_bottom_hip_bump_to_mount_top",
    )
    assert path.final_state.position_id == "mount_top"


def _filter_graph() -> GrapplingGraph:
    return _graph(
        [
            _transition(
                "beginner_sweep",
                "start",
                "target",
                difficulty="beginner",
                transition_type="sweep",
            ),
            _transition(
                "advanced_escape",
                "start",
                "target",
                difficulty="advanced",
                transition_type="escape",
            ),
        ]
    )


def _multiple_paths_graph() -> GrapplingGraph:
    return _graph(
        [
            _transition("direct", "start", "target"),
            _transition("to_middle_a", "start", "middle_a"),
            _transition("finish_a", "middle_a", "target"),
            _transition("to_middle_b", "start", "middle_b"),
            _transition("finish_b", "middle_b", "target"),
        ]
    )


def _graph(
    transitions: Iterable[Transition],
    *,
    position_ids: set[str] | None = None,
    grips: dict[str, Grip] | None = None,
) -> GrapplingGraph:
    transition_list = list(transitions)
    all_position_ids = set(position_ids or ())
    for transition in transition_list:
        all_position_ids.add(transition.from_position)
        all_position_ids.add(transition.to_position)

    positions = {
        position_id: _position(position_id)
        for position_id in all_position_ids
    }
    return GrapplingGraph(
        positions,
        {transition.id: transition for transition in transition_list},
        dict(grips or {}),
    )


def _position(position_id: str) -> Position:
    return Position(
        id=position_id,
        name=position_id.replace("_", " ").title(),
        category="test",
        player_role="test",
        gi_allowed=True,
        no_gi_allowed=True,
        description="Custom pathfinding test position.",
    )


def _grip(grip_id: str, *, gi_required: bool = False) -> Grip:
    return Grip(
        id=grip_id,
        name=grip_id.replace("_", " ").title(),
        grip_type="control",
        gi_required=gi_required,
        control_target="opponent",
        dominant_hand="either",
    )


def _transition(
    transition_id: str,
    from_position: str,
    to_position: str,
    *,
    required_grips: tuple[str, ...] = (),
    created_grips: tuple[str, ...] = (),
    removed_grips: tuple[str, ...] = (),
    gi_allowed: bool = True,
    no_gi_allowed: bool = True,
    difficulty: str = "beginner",
    transition_type: str = "movement",
) -> Transition:
    return Transition(
        id=transition_id,
        name=transition_id.replace("_", " ").title(),
        from_position=from_position,
        to_position=to_position,
        transition_type=transition_type,
        required_grips=list(required_grips),
        created_grips=list(created_grips),
        removed_grips=list(removed_grips),
        gi_allowed=gi_allowed,
        no_gi_allowed=no_gi_allowed,
        difficulty=difficulty,
    )


def _state(
    position_id: str = "start",
    *,
    mode: str = "gi",
    active_control_ids: tuple[str, ...] = (),
) -> GrapplingState:
    return GrapplingState(
        position_id=position_id,
        mode=mode,  # type: ignore[arg-type]
        active_controls=owned_controls(active_control_ids),
    )
