from collections.abc import Iterator
from pathlib import Path
import random

import pytest
from fastapi.testclient import TestClient

from simroll.api.app import app
from simroll.api.dependencies import get_simulator
from simroll.datasets.importer import load_normalized_dataset
from simroll.engine.control_semantics import owned_controls
from simroll.engine import GrapplingGraph, RollSimulator
from simroll.models import GrapplingState

client = TestClient(app)
graph = GrapplingGraph.from_default_data()
simulator = RollSimulator(graph)
NORMALIZED_PATH = Path("data/generated/simroll_bjj_mvp.normalized.json")


class _SeededSimulator(RollSimulator):
    def simulate(self, start_state, *, max_steps, rng=None):
        return super().simulate(
            start_state,
            max_steps=max_steps,
            rng=random.Random(9),
        )


def _control_payloads(control_ids: list[str]) -> list[dict[str, str]]:
    return [
        {
            "control_id": control_id,
            "owner": "player_a",
            "target": "player_b",
        }
        for control_id in control_ids
    ]


def _owned_control_payloads(serialized: str) -> list[dict[str, str]]:
    if not serialized or serialized == "none":
        return []
    controls = []
    for item in serialized.split("; "):
        owner, binding = item.split(":", maxsplit=1)
        control_id, target = binding.split(">", maxsplit=1)
        controls.append(
            {"control_id": control_id, "owner": owner, "target": target}
        )
    return sorted(
        controls,
        key=lambda item: (item["control_id"], item["owner"], item["target"]),
    )


@pytest.fixture(autouse=True)
def restore_dependency_overrides() -> Iterator[None]:
    yield
    app.dependency_overrides.clear()


@pytest.mark.parametrize("sequence_id", ["gi_roll_01", "nogi_roll_04"])
def test_curated_roll_round_trips_through_api_and_history(
    sequence_id: str,
) -> None:
    dataset = load_normalized_dataset(NORMALIZED_PATH)
    example = next(
        item for item in dataset.example_rolls if item.sequence_id == sequence_id
    )
    state = {
        "position_id": example.start_position,
        "mode": example.mode,
        "active_controls": [],
    }
    states = [state]
    actions: list[dict[str, object]] = []

    for step in example.steps:
        assert state == {
            "position_id": step.position_before,
            "mode": example.mode,
            "active_controls": _owned_control_payloads(
                step.active_controls_before
            ),
        }
        available = client.post("/rolls/available", json={"state": state})
        assert available.status_code == 200
        candidates = available.json()

        if step.counts_as_positional_transition:
            matching_actions = [
                action for action in candidates if action["id"] == step.transition_id
            ]
        else:
            matching_actions = [
                action
                for action in candidates
                if action["action_type"] == "control_change"
                and action["template_id"] == step.transition_id
                and action["actor_player"] == step.player_performing
            ]

        expected_state = {
            "position_id": step.resulting_position,
            "mode": example.mode,
            "active_controls": _owned_control_payloads(step.resulting_controls),
        }
        matching_results = []
        for action in matching_actions:
            response = client.post(
                "/rolls/step",
                json={"state": state, "action_id": action["id"]},
            )
            assert response.status_code == 200
            if response.json()["next_state"] == expected_state:
                matching_results.append(response.json())

        assert len(matching_results) == 1
        result = matching_results[0]
        action = result["transition"]
        assert action["actor_player"] == step.player_performing
        actions.append(action)
        state = result["next_state"]
        states.append(state)

    assert state["position_id"] == "submission_terminal"
    assert actions[-1]["action_type"] == "transition"
    assert actions[-1]["submission"] is True
    assert any(action["action_type"] == "control_change" for action in actions)
    assert any(
        action["action_type"] == "transition"
        and action.get("metadata", {}).get("role_change") is True
        for action in actions
    )
    assert len(states) == len(actions) + 1
    historical_control_ids = {
        control["control_id"]
        for historical_state in states
        for control in historical_state["active_controls"]
    }
    garment_control_ids = {
        "belt_grip",
        "collar_grip",
        "lapel_grip",
        "pants_grip",
        "sleeve_grip",
    }
    assert historical_control_ids
    if example.mode == "no_gi":
        assert historical_control_ids.isdisjoint(garment_control_ids)
    else:
        assert historical_control_ids.intersection(garment_control_ids)


def test_roll_choices_returns_valid_gi_transitions_in_id_order() -> None:
    response = client.post(
        "/rolls/available",
        json=_available_payload(
            active_grips=["wrist_control", "sleeve_grip"]
        ),
    )

    assert response.status_code == 200
    body = response.json()
    assert [item for item in body if item["action_type"] == "transition"] == [
        graph.get_transition(transition_id).model_dump(mode="json")
        for transition_id in (
            "closed_guard_bottom_arm_drag_to_back_control_top",
            "closed_guard_bottom_hip_bump_to_mount_top",
            "closed_guard_bottom_opponent_stand_open_to_open_guard_bottom",
        )
    ]
    assert any(item["action_type"] == "control_change" for item in body)


def test_roll_choices_order_is_deterministic() -> None:
    payload = _available_payload(
        active_grips=["wrist_control", "sleeve_grip"]
    )

    responses = [client.post("/rolls/available", json=payload) for _ in range(3)]

    assert all(response.status_code == 200 for response in responses)
    assert responses[0].json() == responses[1].json() == responses[2].json()
    assert [
        item["id"]
        for item in responses[0].json()
        if item["action_type"] == "transition"
    ] == [
        "closed_guard_bottom_arm_drag_to_back_control_top",
        "closed_guard_bottom_hip_bump_to_mount_top",
        "closed_guard_bottom_opponent_stand_open_to_open_guard_bottom",
    ]


def test_roll_choices_respects_no_gi_restrictions() -> None:
    response = client.post(
        "/rolls/available",
        json=_available_payload(mode="no_gi", active_grips=["wrist_control"]),
    )

    assert response.status_code == 200
    assert [
        item["id"]
        for item in response.json()
        if item["action_type"] == "transition"
    ] == [
        "closed_guard_bottom_arm_drag_to_back_control_top",
        "closed_guard_bottom_hip_bump_to_mount_top",
        "closed_guard_bottom_opponent_stand_open_to_open_guard_bottom",
    ]


def test_roll_choices_filters_out_missing_required_grips() -> None:
    response = client.post(
        "/rolls/available",
        json=_available_payload(active_grips=[]),
    )

    assert response.status_code == 200
    assert [
        item["id"]
        for item in response.json()
        if item["action_type"] == "transition"
    ] == [
        "closed_guard_bottom_hip_bump_to_mount_top",
        "closed_guard_bottom_opponent_stand_open_to_open_guard_bottom",
    ]


@pytest.mark.parametrize(
    ("state_update", "detail"),
    [
        ({"position_id": "missing"}, "Unknown position ID 'missing'."),
        (
            {"active_controls": _control_payloads(["missing"])},
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
            transition_id="closed_guard_bottom_hip_bump_to_mount_top",
            active_grips=["wrist_control"],
        ),
    )

    assert response.status_code == 200
    assert response.json() == {
        "transition": graph.get_transition(
            "closed_guard_bottom_hip_bump_to_mount_top"
        ).model_dump(mode="json"),
            "next_state": {
                "position_id": "mount_top",
                "mode": "gi",
                "active_controls": [],
        },
    }


def test_manual_roll_step_clears_controls_not_explicitly_preserved() -> None:
    response = client.post(
        "/rolls/step",
        json=_step_payload(
            transition_id="closed_guard_bottom_hip_bump_to_mount_top",
            active_grips=["wrist_control", "sleeve_grip"],
        ),
    )

    assert response.status_code == 200
    assert response.json()["next_state"] == {
        "position_id": "mount_top",
        "mode": "gi",
        "active_controls": [],
    }


def test_manual_roll_step_preserves_no_gi_mode() -> None:
    response = client.post(
        "/rolls/step",
        json=_step_payload(
            transition_id="closed_guard_bottom_hip_bump_to_mount_top",
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
            transition_id="closed_guard_bottom_hip_bump_to_mount_top",
            position_id="mount_top",
        ),
    )

    assert response.status_code == 400
    assert "starts at 'closed_guard_bottom'" in response.json()["detail"]


def test_manual_roll_step_rejects_missing_required_controls() -> None:
    response = client.post(
        "/rolls/step",
        json=_step_payload(
            transition_id="closed_guard_bottom_arm_drag_to_back_control_top"
        ),
    )

    assert response.status_code == 400
    assert response.json() == {
        "detail": (
            "Transition 'closed_guard_bottom_arm_drag_to_back_control_top' "
            "is missing required active controls: one of "
            "['sleeve_grip', 'two_on_one', 'wrist_control'] owned by player_a."
        )
    }


def test_manual_roll_step_accepts_no_gi_owned_control_requirement() -> None:
    response = client.post(
        "/rolls/step",
        json=_step_payload(
            transition_id="closed_guard_bottom_arm_drag_to_back_control_top",
            mode="no_gi",
            active_grips=["wrist_control"],
        ),
    )

    assert response.status_code == 200
    assert response.json()["next_state"]["position_id"] == "back_control_top"


def test_manual_roll_step_rejects_unknown_transition() -> None:
    response = client.post(
        "/rolls/step",
        json=_step_payload(transition_id="missing"),
    )

    assert response.status_code == 404
    assert response.json() == {
        "detail": "Unknown or unavailable action ID 'missing'."
    }


@pytest.mark.parametrize(
    ("state_update", "detail"),
    [
        ({"position_id": "missing"}, "Unknown position ID 'missing'."),
        (
            {
                "active_controls": _control_payloads(
                    ["wrist_control", "missing"]
                )
            },
            "Unknown grip ID 'missing'.",
        ),
    ],
)
def test_manual_roll_step_translates_unknown_state_resources(
    state_update: dict[str, object],
    detail: str,
) -> None:
    payload = _step_payload(
        transition_id="closed_guard_bottom_hip_bump_to_mount_top",
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
        active_controls=owned_controls({"sleeve_grip", "wrist_control"}),
    )
    valid_transitions = {
        transition.id: transition
        for transition in simulator.get_available_actions(state)
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
        ].model_dump(mode="json")
        assert body["next_state"] == _state_response(
            simulator.step(state, transition_id)
        )


@pytest.mark.parametrize(
    ("mode", "active_grips", "expected_transition_id"),
    [
        ("no_gi", ["wrist_control"], "closed_guard_bottom_hip_bump_to_mount_top"),
        ("gi", ["sleeve_grip"], "closed_guard_bottom_arm_drag_to_back_control_top"),
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
    assert response.json()["transition"]["action_type"] in {
        "transition",
        "control_change",
    }


def test_random_roll_step_returns_null_fields_at_dead_end() -> None:
    response = client.post(
        "/rolls/step",
        json=_step_payload(
            transition_id=None,
            position_id="submission_terminal",
        ),
    )

    assert response.status_code == 200
    assert response.json() == {"transition": None, "next_state": None}


def test_roll_simulation_returns_authoritative_valid_path() -> None:
    start_state = GrapplingState(
        position_id="closed_guard_bottom",
        mode="gi",
        active_controls=owned_controls({"sleeve_grip", "wrist_control"}),
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
    assert body["stop_reason"] in {
        "submission",
        "max_steps",
        "no_available_transitions",
    }
    if body["stop_reason"] == "max_steps":
        assert body["path"]["step_count"] == 4
    elif body["stop_reason"] == "no_available_transitions":
        final_state = GrapplingState.model_validate(body["path"]["states"][-1])
        assert simulator.get_available_actions(final_state) == []
    else:
        assert body["path"]["actions"][-1]["submission"] is True
    _assert_roll_path_is_valid(body["path"])


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
        action["action_type"] == "control_change"
        or graph.get_transition(action["id"]).no_gi_allowed
        for action in path["actions"]
    )
    assert all(state["mode"] == "no_gi" for state in path["states"])
    _assert_roll_path_is_valid(path)


def test_roll_simulation_gi_uses_an_available_transition() -> None:
    response = client.post(
        "/rolls/simulate",
        json=_simulation_payload(
            max_steps=1,
            mode="gi",
            active_grips=["sleeve_grip"],
        ),
    )

    assert response.status_code == 200
    assert len(response.json()["path"]["transition_ids"]) == 1


def test_roll_simulation_executes_control_lifecycle() -> None:
    response = client.post(
        "/rolls/simulate",
        json=_simulation_payload(
            max_steps=1,
            active_grips=["wrist_control"],
        ),
    )

    assert response.status_code == 200
    path = response.json()["path"]
    _assert_roll_path_is_valid(path)


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
                    "active_controls": _control_payloads(
                        ["sleeve_grip", "wrist_control"]
                    ),
                }
            ],
            "transition_ids": [],
            "step_count": 0,
            "actions": [],
            "action_ids": [],
            "positional_steps": 0,
            "control_actions": 0,
            "total_events": 0,
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
            position_id="submission_terminal",
        ),
    )

    assert response.status_code == 200
    assert response.json() == {
        "path": {
            "states": [
                {
                    "position_id": "submission_terminal",
                    "mode": "gi",
                    "active_controls": [],
                }
            ],
            "transition_ids": [],
            "step_count": 0,
            "actions": [],
            "action_ids": [],
            "positional_steps": 0,
            "control_actions": 0,
            "total_events": 0,
        },
        "stop_reason": "no_available_transitions",
    }


def test_roll_simulation_serializes_executed_submission_reason() -> None:
    app.dependency_overrides[get_simulator] = lambda: _SeededSimulator(graph)

    response = client.post(
        "/rolls/simulate",
        json=_simulation_payload(
            max_steps=30,
            position_id="standing_neutral",
            active_grips=[],
        ),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["stop_reason"] == "submission"
    assert body["path"]["states"][-1]["position_id"] == "submission_terminal"
    assert body["path"]["actions"][-1]["submission"] is True
    assert body["path"]["positional_steps"] > 0
    assert body["path"]["total_events"] == (
        body["path"]["positional_steps"] + body["path"]["control_actions"]
    )


@pytest.mark.parametrize(
    ("state_update", "detail"),
    [
        ({"position_id": "missing"}, "Unknown position ID 'missing'."),
        (
            {"active_controls": _control_payloads(["missing"])},
            "Unknown grip ID 'missing'.",
        ),
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
        {
            "state": {"position_id": "closed_guard_bottom", "mode": "gi"},
            "transition_id": "legacy_action",
            "action_id": "preferred_action",
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
        "ActiveControl",
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
            "active_controls": _control_payloads(active_grips or []),
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
            "active_controls": _control_payloads(active_grips or []),
        },
        "max_steps": max_steps,
    }


def _state_response(state: GrapplingState) -> dict[str, object]:
    return {
        "position_id": state.position_id,
        "mode": state.mode,
        "active_controls": [
            control.model_dump()
            for control in sorted(
                state.active_controls,
                key=lambda item: (item.control_id, item.owner, item.target),
            )
        ],
    }


def _assert_roll_path_is_valid(path: dict[str, object]) -> None:
    states = [GrapplingState.model_validate(state) for state in path["states"]]
    actions = path["actions"]

    for index, action in enumerate(actions):
        assert simulator.step(states[index], action["id"]) == states[index + 1]
