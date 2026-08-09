from collections.abc import Iterable, Iterator

import pytest
from fastapi.testclient import TestClient

from simroll.api.app import app
from simroll.api.dependencies import get_graph, get_pathfinder
from simroll.engine import GrapplingGraph, GrapplingPathfinder
from simroll.models import GrapplingState, Grip, Position, Transition

client = TestClient(app)


@pytest.fixture(autouse=True)
def restore_dependency_overrides() -> Iterator[None]:
    yield
    app.dependency_overrides.clear()


def test_available_transitions_returns_valid_gi_transitions_in_id_order() -> None:
    response = client.post(
        "/transitions/available",
        json={
            "position_id": "closed_guard_bottom",
            "mode": "gi",
            "active_grips": ["wrist_control", "sleeve_grip"],
        },
    )

    assert response.status_code == 200
    assert [transition["id"] for transition in response.json()] == [
        "flower_sweep",
        "hip_bump_sweep",
    ]


def test_available_transitions_respects_no_gi_mode() -> None:
    response = client.post(
        "/transitions/available",
        json={
            "position_id": "closed_guard_bottom",
            "mode": "no_gi",
            "active_grips": ["wrist_control"],
        },
    )

    assert response.status_code == 200
    assert [transition["id"] for transition in response.json()] == [
        "hip_bump_sweep"
    ]


def test_available_transitions_omits_transition_without_required_grip() -> None:
    response = client.post(
        "/transitions/available",
        json={
            "position_id": "closed_guard_bottom",
            "mode": "gi",
            "active_grips": [],
        },
    )

    assert response.status_code == 200
    assert response.json() == []


def test_available_transitions_rejects_unknown_position() -> None:
    response = client.post(
        "/transitions/available",
        json={
            "position_id": "missing",
            "mode": "gi",
            "active_grips": [],
        },
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Unknown position ID 'missing'."}


def test_available_transitions_rejects_unknown_grip() -> None:
    response = client.post(
        "/transitions/available",
        json={
            "position_id": "closed_guard_bottom",
            "mode": "gi",
            "active_grips": ["missing"],
        },
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Unknown grip ID 'missing'."}


def test_available_transitions_rejects_gi_grip_in_no_gi_state() -> None:
    response = client.post(
        "/transitions/available",
        json={
            "position_id": "closed_guard_bottom",
            "mode": "no_gi",
            "active_grips": ["sleeve_grip"],
        },
    )

    assert response.status_code == 400
    assert response.json() == {
        "detail": (
            "Gi-required grip 'sleeve_grip' cannot be active in no_gi mode."
        )
    }


def test_available_transitions_are_deterministic_and_ignore_duplicate_grips() -> None:
    payload = {
        "position_id": "closed_guard_bottom",
        "mode": "gi",
        "active_grips": ["wrist_control", "sleeve_grip", "wrist_control"],
    }

    responses = [
        client.post("/transitions/available", json=payload)
        for _ in range(3)
    ]

    assert all(response.status_code == 200 for response in responses)
    assert responses[0].json() == responses[1].json() == responses[2].json()
    assert [transition["id"] for transition in responses[0].json()] == [
        "flower_sweep",
        "hip_bump_sweep",
    ]


def test_shortest_path_returns_direct_default_path() -> None:
    response = client.post(
        "/paths/shortest",
        json={
            "start_state": {
                "position_id": "closed_guard_bottom",
                "mode": "gi",
                "active_grips": ["wrist_control"],
            },
            "target_position_id": "mount_top",
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "path": {
            "states": [
                {
                    "position_id": "closed_guard_bottom",
                    "mode": "gi",
                    "active_grips": ["wrist_control"],
                },
                {
                    "position_id": "mount_top",
                    "mode": "gi",
                    "active_grips": ["underhook"],
                },
            ],
            "transition_ids": ["hip_bump_sweep"],
            "step_count": 1,
        }
    }


def test_shortest_path_serializes_grips_in_sorted_order() -> None:
    graph = _graph(
        [],
        position_ids={"start"},
        grips={grip_id: _grip(grip_id) for grip_id in ("z_grip", "a_grip")},
    )
    _override_engine(graph)

    response = client.post(
        "/paths/shortest",
        json={
            "start_state": {
                "position_id": "start",
                "mode": "gi",
                "active_grips": ["z_grip", "a_grip"],
            },
            "target_position_id": "start",
        },
    )

    assert response.status_code == 200
    assert response.json()["path"]["states"][0]["active_grips"] == [
        "a_grip",
        "z_grip",
    ]


def test_shortest_path_starting_at_target_returns_zero_step_path() -> None:
    response = client.post(
        "/paths/shortest",
        json={
            "start_state": {
                "position_id": "mount_top",
                "mode": "gi",
                "active_grips": [],
            },
            "target_position_id": "mount_top",
        },
    )

    assert response.status_code == 200
    assert response.json()["path"] == {
        "states": [
            {
                "position_id": "mount_top",
                "mode": "gi",
                "active_grips": [],
            }
        ],
        "transition_ids": [],
        "step_count": 0,
    }


def test_shortest_path_returns_null_without_route() -> None:
    graph = _graph([], position_ids={"start", "target"})
    _override_engine(graph)

    response = client.post("/paths/shortest", json=_shortest_payload())

    assert response.status_code == 200
    assert response.json() == {"path": None}


@pytest.mark.parametrize(
    ("payload_update", "detail"),
    [
        (
            {"target_position_id": "missing"},
            "Unknown position ID 'missing'.",
        ),
        (
            {"start_state": {"position_id": "missing", "mode": "gi"}},
            "Unknown position ID 'missing'.",
        ),
        (
            {
                "start_state": {
                    "position_id": "closed_guard_bottom",
                    "mode": "gi",
                    "active_grips": ["missing"],
                }
            },
            "Unknown grip ID 'missing'.",
        ),
    ],
)
def test_shortest_path_translates_unknown_domain_references(
    payload_update: dict[str, object],
    detail: str,
) -> None:
    payload = {
        "start_state": {
            "position_id": "closed_guard_bottom",
            "mode": "gi",
            "active_grips": [],
        },
        "target_position_id": "mount_top",
    }
    payload.update(payload_update)

    response = client.post("/paths/shortest", json=payload)

    assert response.status_code == 404
    assert response.json() == {"detail": detail}


def test_shortest_path_rejects_invalid_grappling_state() -> None:
    response = client.post(
        "/paths/shortest",
        json={
            "start_state": {
                "position_id": "closed_guard_bottom",
                "mode": "no_gi",
                "active_grips": ["sleeve_grip"],
            },
            "target_position_id": "mount_top",
        },
    )

    assert response.status_code == 400
    assert "cannot be active in no_gi mode" in response.json()["detail"]


def test_shortest_path_rejects_negative_max_depth() -> None:
    response = client.post(
        "/paths/shortest",
        json={**_shortest_payload(), "max_depth": -1},
    )

    assert response.status_code == 400
    assert response.json() == {
        "detail": "max_depth must be zero or greater."
    }


@pytest.mark.parametrize(
    ("filters", "expected_transition_ids"),
    [
        ({"difficulties": ["beginner"]}, ["beginner_sweep"]),
        ({"difficulties": ["advanced"]}, ["advanced_escape"]),
        ({"transition_types": ["sweep"]}, ["beginner_sweep"]),
        ({"transition_types": ["escape"]}, ["advanced_escape"]),
        ({"difficulties": []}, None),
        ({"transition_types": []}, None),
    ],
)
def test_shortest_path_preserves_engine_filter_semantics(
    filters: dict[str, list[str]],
    expected_transition_ids: list[str] | None,
) -> None:
    graph = _filter_graph()
    _override_engine(graph)

    response = client.post(
        "/paths/shortest",
        json={**_shortest_payload(), **filters},
    )

    assert response.status_code == 200
    path = response.json()["path"]
    if expected_transition_ids is None:
        assert path is None
    else:
        assert path["transition_ids"] == expected_transition_ids


def test_paths_returns_multiple_routes_in_engine_order() -> None:
    graph = _multiple_paths_graph()
    _override_engine(graph)
    expected = [
        list(path.transition_ids)
        for path in GrapplingPathfinder(graph).find_paths(
            _state_for_engine(), "target"
        )
    ]

    response = client.post("/paths", json=_paths_payload())

    assert response.status_code == 200
    assert isinstance(response.json()["paths"], list)
    assert [
        path["transition_ids"] for path in response.json()["paths"]
    ] == expected
    assert expected == [
        ["direct"],
        ["to_middle_a", "finish_a"],
        ["to_middle_b", "finish_b"],
    ]


def test_paths_respects_max_paths() -> None:
    graph = _multiple_paths_graph()
    _override_engine(graph)

    response = client.post(
        "/paths",
        json={**_paths_payload(), "max_paths": 2},
    )

    assert response.status_code == 200
    assert len(response.json()["paths"]) == 2


def test_paths_respects_max_depth() -> None:
    graph = _graph(
        [
            _transition("first", "start", "middle"),
            _transition("second", "middle", "target"),
        ]
    )
    _override_engine(graph)

    response = client.post(
        "/paths",
        json={**_paths_payload(), "max_depth": 1},
    )

    assert response.status_code == 200
    assert response.json() == {"paths": []}


@pytest.mark.parametrize(
    ("filters", "expected_transition_ids"),
    [
        ({"difficulties": ["beginner"]}, [["beginner_sweep"]]),
        ({"transition_types": ["escape"]}, [["advanced_escape"]]),
        (
            {
                "difficulties": ["beginner"],
                "transition_types": ["sweep"],
            },
            [["beginner_sweep"]],
        ),
        (
            {
                "difficulties": ["advanced"],
                "transition_types": ["sweep"],
            },
            [],
        ),
    ],
)
def test_paths_preserves_engine_filter_semantics(
    filters: dict[str, list[str]],
    expected_transition_ids: list[list[str]],
) -> None:
    _override_engine(_filter_graph())

    response = client.post(
        "/paths",
        json={**_paths_payload(), **filters},
    )

    assert response.status_code == 200
    assert [
        path["transition_ids"] for path in response.json()["paths"]
    ] == expected_transition_ids


def test_paths_starting_at_target_returns_one_zero_step_path() -> None:
    graph = _graph([], position_ids={"start"})
    _override_engine(graph)

    response = client.post(
        "/paths",
        json={
            **_paths_payload(),
            "target_position_id": "start",
            "max_depth": 0,
        },
    )

    assert response.status_code == 200
    assert response.json()["paths"] == [
        {
            "states": [
                {
                    "position_id": "start",
                    "mode": "gi",
                    "active_grips": [],
                }
            ],
            "transition_ids": [],
            "step_count": 0,
        }
    ]


def test_paths_returns_empty_array_without_route() -> None:
    _override_engine(_graph([], position_ids={"start", "target"}))

    response = client.post("/paths", json=_paths_payload())

    assert response.status_code == 200
    assert response.json() == {"paths": []}


@pytest.mark.parametrize(
    ("parameter", "value", "detail"),
    [
        ("max_paths", 0, "max_paths must be greater than zero."),
        ("max_paths", -1, "max_paths must be greater than zero."),
        ("max_depth", -1, "max_depth must be zero or greater."),
    ],
)
def test_paths_rejects_invalid_search_parameters(
    parameter: str,
    value: int,
    detail: str,
) -> None:
    response = client.post(
        "/paths",
        json={**_paths_payload(), parameter: value},
    )

    assert response.status_code == 400
    assert response.json() == {"detail": detail}


def test_pathfinding_request_validation_uses_422() -> None:
    response = client.post(
        "/paths/shortest",
        json={
            "start_state": {
                "position_id": "closed_guard_bottom",
                "mode": "invalid",
            },
            "target_position_id": "mount_top",
        },
    )

    assert response.status_code == 422


def test_openapi_documents_pathfinding_routes_and_schemas() -> None:
    response = client.get("/openapi.json")

    assert response.status_code == 200
    document = response.json()
    assert "post" in document["paths"]["/transitions/available"]
    assert "post" in document["paths"]["/paths/shortest"]
    assert "post" in document["paths"]["/paths"]
    assert {
        "AvailableTransitionsRequest",
        "GrapplingStateResponse",
        "GrapplingPathResponse",
        "ShortestPathRequest",
        "ShortestPathResponse",
        "PathsRequest",
        "PathsResponse",
    }.issubset(document["components"]["schemas"])


def _override_engine(graph: GrapplingGraph) -> None:
    app.dependency_overrides[get_graph] = lambda: graph
    app.dependency_overrides[get_pathfinder] = lambda: GrapplingPathfinder(graph)


def _shortest_payload() -> dict[str, object]:
    return {
        "start_state": {
            "position_id": "start",
            "mode": "gi",
            "active_grips": [],
        },
        "target_position_id": "target",
    }


def _paths_payload() -> dict[str, object]:
    return {
        **_shortest_payload(),
        "max_paths": 10,
        "max_depth": 10,
    }


def _state_for_engine() -> GrapplingState:
    return GrapplingState(position_id="start", mode="gi")


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
        all_position_ids.update(
            (transition.from_position, transition.to_position)
        )

    positions = {
        position_id: Position(
            id=position_id,
            name=position_id.replace("_", " ").title(),
            category="test",
            player_role="test",
            gi_allowed=True,
            no_gi_allowed=True,
            description="Custom API test position.",
        )
        for position_id in all_position_ids
    }
    return GrapplingGraph(
        positions,
        {transition.id: transition for transition in transition_list},
        dict(grips or {}),
    )


def _grip(grip_id: str) -> Grip:
    return Grip(
        id=grip_id,
        name=grip_id.replace("_", " ").title(),
        grip_type="control",
        gi_required=False,
        control_target="opponent",
        dominant_hand="either",
    )


def _transition(
    transition_id: str,
    from_position: str,
    to_position: str,
    *,
    difficulty: str = "beginner",
    transition_type: str = "movement",
) -> Transition:
    return Transition(
        id=transition_id,
        name=transition_id.replace("_", " ").title(),
        from_position=from_position,
        to_position=to_position,
        transition_type=transition_type,
        gi_allowed=True,
        no_gi_allowed=True,
        difficulty=difficulty,
    )
