from fastapi.testclient import TestClient

from simroll.api.app import app
from simroll.engine import GrapplingGraph

client = TestClient(app)
graph = GrapplingGraph.from_default_data()


def test_root_identifies_simroll_api() -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {"name": "SimRoll API", "status": "ok"}


def test_health_reports_ok() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_positions_returns_default_models_in_id_order() -> None:
    response = client.get("/positions")

    assert response.status_code == 200
    assert response.json() == [
        position.model_dump(mode="json")
        for position in sorted(
            graph.positions.values(),
            key=lambda position: position.id,
        )
    ]
    assert len(response.json()) == 20
    assert any(position["id"] == "submission_terminal" for position in response.json())


def test_position_returns_existing_model() -> None:
    response = client.get("/positions/closed_guard_bottom")

    assert response.status_code == 200
    assert response.json() == graph.get_position(
        "closed_guard_bottom"
    ).model_dump(mode="json")
    assert response.json()["name"] == "Closed Guard — Player A Bottom"


def test_unknown_position_returns_clear_404() -> None:
    response = client.get("/positions/missing_position")

    assert response.status_code == 404
    assert response.json() == {
        "detail": "Unknown position ID 'missing_position'."
    }


def test_grips_returns_all_default_models_in_id_order() -> None:
    response = client.get("/grips")

    assert response.status_code == 200
    expected_grips = sorted(
        graph.grips.values(),
        key=lambda grip: grip.id,
    )
    assert response.json() == [grip.model_dump(mode="json") for grip in expected_grips]
    assert len(response.json()) == 17
    assert [grip["id"] for grip in response.json()] == sorted(graph.grips)
    assert set(response.json()[0]) == set(type(expected_grips[0]).model_fields)


def test_grip_returns_existing_model() -> None:
    response = client.get("/grips/underhook")

    assert response.status_code == 200
    assert response.json() == graph.get_grip("underhook").model_dump(mode="json")


def test_unknown_grip_returns_clear_404() -> None:
    response = client.get("/grips/missing_grip")

    assert response.status_code == 404
    assert response.json() == {"detail": "Unknown grip ID 'missing_grip'."}


def test_transitions_returns_default_models_in_id_order() -> None:
    response = client.get("/transitions")

    assert response.status_code == 200
    assert response.json() == [
        transition.model_dump(mode="json")
        for transition in sorted(
            graph.transitions.values(),
            key=lambda transition: transition.id,
        )
    ]
    assert len(response.json()) == 65
    assert sum(transition["submission"] for transition in response.json()) == 10


def test_transition_returns_existing_model() -> None:
    transition_id = "closed_guard_bottom_hip_bump_to_mount_top"
    response = client.get(f"/transitions/{transition_id}")

    assert response.status_code == 200
    assert response.json() == graph.get_transition(transition_id).model_dump(mode="json")
    assert response.json()["name"] == "Hip-Bump Sweep to Mount"


def test_unknown_transition_returns_clear_404() -> None:
    response = client.get("/transitions/missing_transition")

    assert response.status_code == 404
    assert response.json() == {
        "detail": "Unknown transition ID 'missing_transition'."
    }


def test_position_transitions_returns_outgoing_models_in_id_order() -> None:
    response = client.get("/positions/closed_guard_bottom/transitions")

    assert response.status_code == 200
    assert response.json() == [
        transition.model_dump(mode="json")
        for transition in sorted(
            graph.get_transitions_from("closed_guard_bottom"),
            key=lambda item: item.id,
        )
    ]


def test_position_without_outgoing_transitions_returns_empty_list() -> None:
    response = client.get("/positions/submission_terminal/transitions")

    assert response.status_code == 200
    assert response.json() == []


def test_unknown_position_transitions_returns_clear_404() -> None:
    response = client.get("/positions/missing_position/transitions")

    assert response.status_code == 404
    assert response.json() == {
        "detail": "Unknown position ID 'missing_position'."
    }


def test_openapi_documents_resource_response_schemas() -> None:
    response = client.get("/openapi.json")

    assert response.status_code == 200
    schemas = response.json()["components"]["schemas"]
    assert "Grip" in schemas
    assert "Position" in schemas
    assert "Transition" in schemas


def test_interactive_docs_are_available() -> None:
    response = client.get("/docs")

    assert response.status_code == 200
