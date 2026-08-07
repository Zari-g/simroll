"""FastAPI application exposing SimRoll graph resources."""

from typing import Annotated, NoReturn

from fastapi import Depends, FastAPI, HTTPException, status

from simroll.api.dependencies import get_graph
from simroll.engine import GrapplingGraph
from simroll.models import Position, Transition

app = FastAPI(
    title="SimRoll API",
    version="0.1.0",
    description=(
        "API for exploring SimRoll Brazilian Jiu-Jitsu positions and "
        "transitions."
    ),
)

GraphDependency = Annotated[GrapplingGraph, Depends(get_graph)]


@app.get("/")
def read_root() -> dict[str, str]:
    """Identify the API service."""

    return {"name": "SimRoll API", "status": "ok"}


@app.get("/health")
def read_health() -> dict[str, str]:
    """Report whether the API process is available."""

    return {"status": "ok"}


@app.get("/positions", response_model=list[Position])
def list_positions(graph: GraphDependency) -> list[Position]:
    """Return every position in deterministic ID order."""

    return sorted(graph.positions.values(), key=lambda position: position.id)


@app.get("/positions/{position_id}", response_model=Position)
def get_position(position_id: str, graph: GraphDependency) -> Position:
    """Return a position by ID."""

    try:
        return graph.get_position(position_id)
    except KeyError as error:
        _raise_not_found(error)


@app.get(
    "/positions/{position_id}/transitions",
    response_model=list[Transition],
)
def list_position_transitions(
    position_id: str,
    graph: GraphDependency,
) -> list[Transition]:
    """Return transitions structurally leaving a position."""

    try:
        transitions = graph.get_transitions_from(position_id)
    except KeyError as error:
        _raise_not_found(error)
    return sorted(transitions, key=lambda transition: transition.id)


@app.get("/transitions", response_model=list[Transition])
def list_transitions(graph: GraphDependency) -> list[Transition]:
    """Return every transition in deterministic ID order."""

    return sorted(
        graph.transitions.values(),
        key=lambda transition: transition.id,
    )


@app.get("/transitions/{transition_id}", response_model=Transition)
def get_transition(
    transition_id: str,
    graph: GraphDependency,
) -> Transition:
    """Return a transition by ID."""

    try:
        return graph.get_transition(transition_id)
    except KeyError as error:
        _raise_not_found(error)


def _raise_not_found(error: KeyError) -> NoReturn:
    """Translate a known graph lookup error into an HTTP 404 response."""

    detail = str(error.args[0])
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=detail,
    ) from error
