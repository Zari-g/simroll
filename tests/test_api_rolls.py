from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from simroll.api.app import app
from simroll.engine import GrapplingGraph, RollSimulator
from simroll.models import GrapplingState

client = TestClient(app)
graph = GrapplingGraph.from_default_data()
simulator = RollSimulator(graph)


@pytest.fixture(autouse=True)
def restore_dependency_overrides() -> Iterator[None]:
    yield
    app.dependency_overrides.clear()


def test_roll_choices_returns_valid_gi_transitions_in_id_order() -> None:
    response = client.post(
        "/rolls/available",
        json=_available_payload(
            active_grips=["wrist_control", "sleeve_grip"]
        ),
    )

    assert response.status_code == 200
    assert response.json() == [
        graph.get_transition(transition_id).model_dump()
        for transition_id in ("flower_sweep", "hip_bump_sweep")
    ]


def test_roll_choices_order_is_deterministic() -> None:
    payload = _available_payload(
        active_grips=["wrist_control", "sleeve_grip"]
    )

    responses = [client.post("/rolls/available", json=payload) for _ in range(3)]

    assert all(response.status_code == 200 for response in responses)
    assert responses[0].json() == responses[1].json() == responses[2].json()
    assert [item["id"] for item in responses[0].json()] == [
        "flower_sweep",
        "hip_bump_sweep",
    ]


def test_roll_choices_respects_no_gi_restrictions() -> None:
    response = client.post(
        "/rolls/available",
        json=_available_payload(mode="no_gi", active_grips=["wrist_control"]),
    )

    assert response.status_code == 200
    assert [item["id"] for item in response.json()] == ["hip_bump_sweep"]


def test_roll_choices_filters_out_missing_required_grips() -> None:
    response = client.post(
        "/rolls/available",
        json=_available_payload(active_grips=[]),
    )

    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.parametrize(
    ("state_update", "detail"),
    [
        ({"position_id": "missing"}, "Unknown position ID 'missing'."),
        (
            {"active_grips": ["missing"]},
            "Unknown grip ID 'missing'.",
        ),
    ],
)
def test_roll_choices_translates_unknown_state_resources(
    state_update: dict[str, object],
    detail: str,
) -> None:
    payload = _available_payload()
    payload["state"].update(state_update)

    response = client.post("/rolls/available", json=payload)

    assert response.status_code == 404
    assert response.json() == {"detail": detail}


def test_roll_choices_rejects_invalid_state() -> None:
    response = client.post(
        "/rolls/available",
        json=_available_payload(
            mode="no_gi", active_grips=["sleeve_grip"]
        ),
    )

    assert response.status_code == 400
    assert response.json() == {
        "detail": (
            "Gi-required grip 'sleeve_grip' cannot be active in no_gi mode."
        )
    }


def test_manual_roll_step_returns_transition_and_authoritative_next_state() -> None:
    response = client.post(
        "/rolls/step",
        json=_step_payload(
            transition_id="hip_bump_sweep",
            active_grips=["wrist_control"],
        ),
    )

    assert response.status_code == 200
    assert response.json() == {
        "transition": graph.get_transition("hip_bump_sweep").model_dump(),
        "next_state": {
            "position_id": "mount_top",
            "mode": "gi",
            "active_grips": ["underhook"],
        },
    }


def test_manual_roll_step_preserves_other_grips_and_sorts_response() -> None:
    response = client.post(
        "/rolls/step",
        json=_step_payload(
            transition_id="hip_bump_sweep",
            active_grips=["wrist_control", "sleeve_grip"],
        ),
    )

    assert response.status_code == 200
    assert response.json()["next_state"] == {
        "position_id": "mount_top",
        "mode": "gi",
        "active_grips": ["sleeve_grip", "underhook"],
    }


def test_manual_roll_step_preserves_no_gi_mode() -> None:
    response = client.post(
        "/rolls/step",
        json=_step_payload(
            transition_id="hip_bump_sweep",
            mode="no_gi",
            active_grips=["wrist_control"],
        ),
    )

    assert response.status_code == 200
    assert response.json()["next_state"]["mode"] == "no_gi"


def test_manual_roll_step_rejects_transition_from_wrong_position() -> None:
    response = client.post(
        "/rolls/step",
        json=_step_payload(
            transition_id="hip_bump_sweep",
            position_id="mount_top",
        ),
    )

    assert response.status_code == 400
    assert "starts at 'closed_guard_bottom'" in response.json()["detail"]


def test_manual_roll_step_rejects_missing_required_grips() -> None:
    response = client.post(
        "/rolls/step",
        json=_step_payload(transition_id="hip_bump_sweep"),
    )

    assert response.status_code == 400
    assert response.json() == {
        "detail": (
            "Transition 'hip_bump_sweep' is missing required active grips: "
            "'wrist_control'."
        )
    }


def test_manual_roll_step_rejects_mode_invalid_transition() -> None:
    response = client.post(
        "/rolls/step",
        json=_step_payload(transition_id="flower_sweep", mode="no_gi"),
    )

    assert response.status_code == 400
    assert response.json() == {
        "detail": "Transition 'flower_sweep' is not allowed in no_gi mode."
    }


def test_manual_roll_step_rejects_unknown_transition() -> None:
    response = client.post(
        "/rolls/step",
        json=_step_payload(transition_id="missing"),
    )

    assert response.status_code == 404
    assert response.json() == {
        "detail": "Unknown transition ID 'missing'."
    }


@pytest.mark.parametrize(
    ("state_update", "detail"),
    [
        ({"position_id": "missing"}, "Unknown position ID 'missing'."),
        (
            {"active_grips": ["wrist_control", "missing"]},
            "Unknown grip ID 'missing'.",
        ),
    ],
)
def test_manual_roll_step_translates_unknown_state_resources(
    state_update: dict[str, object],
    detail: str,
) -> None:
    payload = _step_payload(
        transition_id="hip_bump_sweep",
        active_grips=["wrist_control"],
    )
    payload["state"].update(state_update)

    response = client.post("/rolls/step", json=payload)

    assert response.status_code == 404
    assert response.json() == {"detail": detail}


def test_random_roll_step_returns_only_valid_transition_and_matching_state() -> None:
    state = GrapplingState(
        position_id="closed_guard_bottom",
        mode="gi",
        active_grips={"sleeve_grip", "wrist_control"},
    )
    valid_transitions = {
        transition.id: transition
        for transition in simulator.get_available_transitions(state)
    }

    for _ in range(20):
        response = client.post(
            "/rolls/step",
            json=_step_payload(
                transition_id=None,
                active_grips=["sleeve_grip", "wrist_control"],
            ),
        )

        assert response.status_code == 200
        body = response.json()
        transition_id = body["transition"]["id"]
        assert transition_id in valid_transitions
        assert body["transition"] == valid_transitions[
            transition_id
        ].model_dump()
        assert body["next_state"] == _state_response(
            graph.apply_transition(state, transition_id)
        )


@pytest.mark.parametrize(
    ("mode", "active_grips", "expected_transition_id"),
    [
        ("no_gi", ["wrist_control"], "hip_bump_sweep"),
        ("gi", ["sleeve_grip"], "flower_sweep"),
    ],
)
def test_random_roll_step_respects_mode_and_grip_rules(
    mode: str,
    active_grips: list[str],
    expected_transition_id: str,
) -> None:
    response = client.post(
        "/rolls/step",
        json=_step_payload(
            transition_id=None,
            mode=mode,
            active_grips=active_grips,
        ),
    )

    assert response.status_code == 200
    assert response.json()["transition"]["id"] == expected_transition_id


def test_random_roll_step_returns_null_fields_at_dead_end() -> None:
    response = client.post(
        "/rolls/step",
        json=_step_payload(
            transition_id=None,
            position_id="side_control_top",
        ),
    )

    assert response.status_code == 200
    assert response.json() == {"transition": None, "next_state": None}


def test_roll_simulation_returns_authoritative_valid_path() -> None:
    start_state = GrapplingState(
        position_id="closed_guard_bottom",
        mode="gi",
        active_grips={"sleeve_grip", "wrist_control"},
    )

    response = client.post(
        "/rolls/simulate",
        json=_simulation_payload(
            max_steps=4,
            active_grips=["wrist_control", "sleeve_grip"],
        ),
    )

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"path", "stop_reason"}
    assert body["path"]["states"][0] == _state_response(start_state)
    assert body["path"]["step_count"] == len(
        body["path"]["transition_ids"]
    )
    assert len(body["path"]["states"]) == (
        len(body["path"]["transition_ids"]) + 1
    )
    assert body["stop_reason"] == "max_steps"
    _assert_path_is_graph_valid(body["path"])


def test_roll_simulation_no_gi_never_uses_gi_only_transitions() -> None:
    response = client.post(
        "/rolls/simulate",
        json=_simulation_payload(
            max_steps=6,
            mode="no_gi",
            active_grips=["wrist_control"],
        ),
    )

    assert response.status_code == 200
    path = response.json()["path"]
    assert path["transition_ids"]
    assert all(
        graph.get_transition(transition_id).no_gi_allowed
        for transition_id in path["transition_ids"]
    )
    assert all(state["mode"] == "no_gi" for state in path["states"])
    _assert_path_is_graph_valid(path)


def test_roll_simulation_gi_can_use_gi_only_transition() -> None:
    response = client.post(
        "/rolls/simulate",
        json=_simulation_payload(
            max_steps=1,
            mode="gi",
            active_grips=["sleeve_grip"],
        ),
    )

    assert response.status_code == 200
    assert response.json()["path"]["transition_ids"] == ["flower_sweep"]


@pytest.mark.parametrize(
    ("active_grips", "expected_grips"),
    [
        (["wrist_control"], ["underhook"]),
        (["sleeve_grip"], []),
    ],
)
def test_roll_simulation_returns_engine_grip_changes(
    active_grips: list[str],
    expected_grips: list[str],
) -> None:
    response = client.post(
        "/rolls/simulate",
        json=_simulation_payload(
            max_steps=1,
            active_grips=active_grips,
        ),
    )

    assert response.status_code == 200
    assert response.json()["path"]["states"][1][
        "active_grips"
    ] == expected_grips


def test_roll_simulation_zero_steps_returns_only_start_state() -> None:
    payload = _simulation_payload(
        max_steps=0,
        active_grips=["wrist_control", "sleeve_grip"],
    )

    response = client.post("/rolls/simulate", json=payload)

    assert response.status_code == 200
    assert response.json() == {
        "path": {
            "states": [
                {
                    "position_id": "closed_guard_bottom",
                    "mode": "gi",
                    "active_grips": ["sleeve_grip", "wrist_control"],
                }
            ],
            "transition_ids": [],
            "step_count": 0,
        },
        "stop_reason": "max_steps",
    }


@pytest.mark.parametrize("max_steps", [1, 3, 7])
def test_roll_simulation_never_exceeds_requested_bound(
    max_steps: int,
) -> None:
    response = client.post(
        "/rolls/simulate",
        json=_simulation_payload(
            max_steps=max_steps,
            active_grips=["wrist_control", "sleeve_grip"],
        ),
    )

    assert response.status_code == 200
    assert response.json()["path"]["step_count"] <= max_steps


def test_roll_simulation_returns_zero_step_path_at_dead_end() -> None:
    response = client.post(
        "/rolls/simulate",
        json=_simulation_payload(
            max_steps=5,
            position_id="side_control_top",
        ),
    )

    assert response.status_code == 200
    assert response.json() == {
        "path": {
            "states": [
                {
                    "position_id": "side_control_top",
                    "mode": "gi",
                    "active_grips": [],
                }
            ],
            "transition_ids": [],
            "step_count": 0,
        },
        "stop_reason": "no_available_transitions",
    }


def test_roll_simulation_reports_early_dead_end() -> None:
    response = client.post(
        "/rolls/simulate",
        json=_simulation_payload(
            max_steps=5,
            mode="no_gi",
            active_grips=["wrist_control"],
        ),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["path"]["step_count"] == 2
    assert body["path"]["step_count"] < 5
    assert body["stop_reason"] == "no_available_transitions"
    _assert_path_is_graph_valid(body["path"])


@pytest.mark.parametrize(
    ("state_update", "detail"),
    [
        ({"position_id": "missing"}, "Unknown position ID 'missing'."),
        ({"active_grips": ["missing"]}, "Unknown grip ID 'missing'."),
    ],
)
def test_roll_simulation_translates_unknown_state_resources(
    state_update: dict[str, object],
    detail: str,
) -> None:
    payload = _simulation_payload(max_steps=2)
    payload["start_state"].update(state_update)

    response = client.post("/rolls/simulate", json=payload)

    assert response.status_code == 404
    assert response.json() == {"detail": detail}


def test_roll_simulation_rejects_gi_grip_in_no_gi() -> None:
    response = client.post(
        "/rolls/simulate",
        json=_simulation_payload(
            max_steps=2,
            mode="no_gi",
            active_grips=["sleeve_grip"],
        ),
    )

    assert response.status_code == 400
    assert response.json() == {
        "detail": (
            "Gi-required grip 'sleeve_grip' cannot be active in no_gi mode."
        )
    }


@pytest.mark.parametrize(
    "payload",
    [
        {"max_steps": 1},
        {
            "start_state": {
                "position_id": "closed_guard_bottom",
                "mode": "invalid",
            },
            "max_steps": 1,
        },
        {
            "start_state": {
                "position_id": "closed_guard_bottom",
                "mode": "gi",
            },
            "max_steps": -1,
        },
        {
            "start_state": {
                "position_id": "closed_guard_bottom",
                "mode": "gi",
            },
            "max_steps": 1,
            "unexpected": True,
        },
        {
            "start_state": {
                "position_id": "closed_guard_bottom",
                "mode": "gi",
                "unexpected": True,
            },
            "max_steps": 1,
        },
    ],
)
def test_roll_simulation_request_validation_uses_422(
    payload: dict[str, object],
) -> None:
    response = client.post("/rolls/simulate", json=payload)

    assert response.status_code == 422


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"state": {"position_id": "closed_guard_bottom", "mode": "invalid"}},
        {
            "state": {"position_id": "closed_guard_bottom", "mode": "gi"},
            "unexpected": True,
        },
        {
            "state": {
                "position_id": "closed_guard_bottom",
                "mode": "gi",
                "unexpected": True,
            }
        },
        {
            "state": {"position_id": "closed_guard_bottom", "mode": "gi"},
            "transition_id": "",
        },
    ],
)
def test_roll_step_request_validation_uses_422(
    payload: dict[str, object],
) -> None:
    response = client.post("/rolls/step", json=payload)

    assert response.status_code == 422


def test_roll_available_request_forbids_extra_fields() -> None:
    response = client.post(
        "/rolls/available",
        json={**_available_payload(), "unexpected": True},
    )

    assert response.status_code == 422


def test_openapi_documents_roll_routes_and_schemas() -> None:
    response = client.get("/openapi.json")

    assert response.status_code == 200
    document = response.json()
    assert "post" in document["paths"]["/rolls/available"]
    assert "post" in document["paths"]["/rolls/step"]
    assert "post" in document["paths"]["/rolls/simulate"]
    assert {
        "RollAvailableRequest",
        "RollSimulationRequest",
        "RollSimulationResponse",
        "RollStepRequest",
        "RollStepResponse",
    }.issubset(document["components"]["schemas"])


def _available_payload(
    *,
    position_id: str = "closed_guard_bottom",
    mode: str = "gi",
    active_grips: list[str] | None = None,
) -> dict[str, dict[str, object]]:
    return {
        "state": {
            "position_id": position_id,
            "mode": mode,
            "active_grips": active_grips or [],
        }
    }


def _step_payload(
    *,
    transition_id: str | None,
    position_id: str = "closed_guard_bottom",
    mode: str = "gi",
    active_grips: list[str] | None = None,
) -> dict[str, object]:
    return {
        **_available_payload(
            position_id=position_id,
            mode=mode,
            active_grips=active_grips,
        ),
        "transition_id": transition_id,
    }


def _simulation_payload(
    *,
    max_steps: int,
    position_id: str = "closed_guard_bottom",
    mode: str = "gi",
    active_grips: list[str] | None = None,
) -> dict[str, object]:
    return {
        "start_state": {
            "position_id": position_id,
            "mode": mode,
            "active_grips": active_grips or [],
        },
        "max_steps": max_steps,
    }


def _state_response(state: GrapplingState) -> dict[str, object]:
    return {
        "position_id": state.position_id,
        "mode": state.mode,
        "active_grips": sorted(state.active_grips),
    }


def _assert_path_is_graph_valid(path: dict[str, object]) -> None:
    states = [GrapplingState.model_validate(state) for state in path["states"]]
    transition_ids = path["transition_ids"]

    for index, transition_id in enumerate(transition_ids):
        assert transition_id in graph.transitions
        assert graph.apply_transition(states[index], transition_id) == states[
            index + 1
        ]
