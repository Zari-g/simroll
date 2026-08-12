"""FastAPI application exposing SimRoll graph resources."""

from typing import Annotated, NoReturn

from fastapi import Depends, FastAPI, HTTPException, status

from simroll.api.dependencies import get_graph, get_pathfinder, get_simulator
from simroll.api.schemas import (
    AvailableTransitionsRequest,
    GrapplingPathResponse,
    GrapplingStateResponse,
    PathsRequest,
    PathsResponse,
    RollAvailableRequest,
    RollSimulationRequest,
    RollSimulationResponse,
    RollStepRequest,
    RollStepResponse,
    ShortestPathRequest,
    ShortestPathResponse,
)
from simroll.engine import GrapplingGraph, GrapplingPathfinder, RollSimulator
from simroll.models import GrapplingState, Grip, Position, Transition

app = FastAPI(
    title="SimRoll API",
    version="0.1.0",
    description=(
        "API for exploring SimRoll Brazilian Jiu-Jitsu positions and "
        "transitions."
    ),
)

GraphDependency = Annotated[GrapplingGraph, Depends(get_graph)]
PathfinderDependency = Annotated[
    GrapplingPathfinder,
    Depends(get_pathfinder),
]
SimulatorDependency = Annotated[RollSimulator, Depends(get_simulator)]


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


@app.get("/grips", response_model=list[Grip])
def list_grips(graph: GraphDependency) -> list[Grip]:
    """Return every grip in deterministic ID order."""

    return sorted(graph.grips.values(), key=lambda grip: grip.id)


@app.get("/grips/{grip_id}", response_model=Grip)
def get_grip(grip_id: str, graph: GraphDependency) -> Grip:
    """Return a grip by ID."""

    try:
        return graph.get_grip(grip_id)
    except KeyError as error:
        _raise_not_found(error)


@app.get("/transitions", response_model=list[Transition])
def list_transitions(graph: GraphDependency) -> list[Transition]:
    """Return every transition in deterministic ID order."""

    return sorted(
        graph.transitions.values(),
        key=lambda transition: transition.id,
    )


@app.post(
    "/transitions/available",
    response_model=list[Transition],
    summary="List transitions available from a grappling state",
)
def list_available_transitions(
    request: AvailableTransitionsRequest,
    graph: GraphDependency,
) -> list[Transition]:
    """Return outgoing transitions usable in the supplied state."""

    state = GrapplingState(
        position_id=request.position_id,
        mode=request.mode,
        active_grips=request.active_grips,
    )
    try:
        graph.validate_state(state)
        transitions = graph.get_available_transitions(
            state.position_id,
            state.mode,
            state.active_grips,
        )
    except KeyError as error:
        _raise_not_found(error)
    except ValueError as error:
        _raise_bad_request(error)
    return sorted(transitions, key=lambda transition: transition.id)


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


@app.post(
    "/paths/shortest",
    response_model=ShortestPathResponse,
    summary="Find the shortest valid path to a position",
)
def find_shortest_path(
    request: ShortestPathRequest,
    pathfinder: PathfinderDependency,
) -> ShortestPathResponse:
    """Return the shortest engine path, or null when none exists."""

    try:
        path = pathfinder.find_shortest_path(
            request.start_state,
            request.target_position_id,
            difficulties=request.difficulties,
            transition_types=request.transition_types,
            max_depth=request.max_depth,
        )
    except KeyError as error:
        _raise_not_found(error)
    except ValueError as error:
        _raise_bad_request(error)

    return ShortestPathResponse(
        path=(
            GrapplingPathResponse.from_domain(path)
            if path is not None
            else None
        )
    )


@app.post(
    "/paths",
    response_model=PathsResponse,
    summary="Find valid paths to a position",
)
def find_paths(
    request: PathsRequest,
    pathfinder: PathfinderDependency,
) -> PathsResponse:
    """Return engine-ordered paths that satisfy the supplied limits."""

    try:
        paths = pathfinder.find_paths(
            request.start_state,
            request.target_position_id,
            difficulties=request.difficulties,
            transition_types=request.transition_types,
            max_paths=request.max_paths,
            max_depth=request.max_depth,
        )
    except KeyError as error:
        _raise_not_found(error)
    except ValueError as error:
        _raise_bad_request(error)

    return PathsResponse(
        paths=[GrapplingPathResponse.from_domain(path) for path in paths]
    )


@app.post(
    "/rolls/available",
    response_model=list[Transition],
    summary="List valid choices for the next roll step",
)
def list_roll_choices(
    request: RollAvailableRequest,
    simulator: SimulatorDependency,
) -> list[Transition]:
    """Return simulator-validated transitions for the supplied state."""

    try:
        return simulator.get_available_transitions(request.state)
    except KeyError as error:
        _raise_not_found(error)
    except ValueError as error:
        _raise_bad_request(error)


@app.post(
    "/rolls/step",
    response_model=RollStepResponse,
    summary="Perform one selected or random roll step",
)
def perform_roll_step(
    request: RollStepRequest,
    graph: GraphDependency,
    simulator: SimulatorDependency,
) -> RollStepResponse:
    """Apply one transition, or return null fields at a random dead end."""

    try:
        if request.transition_id is not None:
            transition = graph.get_transition(request.transition_id)
            next_state = simulator.step(request.state, transition.id)
        else:
            result = simulator.random_step(request.state)
            if result is None:
                return RollStepResponse(transition=None, next_state=None)
            transition, next_state = result
    except KeyError as error:
        _raise_not_found(error)
    except ValueError as error:
        _raise_bad_request(error)

    return RollStepResponse(
        transition=transition,
        next_state=GrapplingStateResponse.from_domain(next_state),
    )


@app.post(
    "/rolls/simulate",
    response_model=RollSimulationResponse,
    summary="Simulate a bounded random roll sequence",
)
def simulate_roll(
    request: RollSimulationRequest,
    simulator: SimulatorDependency,
) -> RollSimulationResponse:
    """Return a simulator-generated path and its deterministic stop reason."""

    try:
        path = simulator.simulate(
            request.start_state,
            max_steps=request.max_steps,
        )
        if path.step_count == request.max_steps:
            stop_reason = "max_steps"
        else:
            if simulator.get_available_transitions(path.final_state):
                raise RuntimeError(
                    "Simulation stopped before max_steps despite available "
                    "transitions."
                )
            stop_reason = "no_available_transitions"
    except KeyError as error:
        _raise_not_found(error)
    except ValueError as error:
        _raise_bad_request(error)

    return RollSimulationResponse(
        path=GrapplingPathResponse.from_domain(path),
        stop_reason=stop_reason,
    )


def _raise_not_found(error: KeyError) -> NoReturn:
    """Translate a known graph lookup error into an HTTP 404 response."""

    detail = str(error.args[0])
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=detail,
    ) from error


def _raise_bad_request(error: ValueError) -> NoReturn:
    """Translate a known domain validation error into an HTTP 400 response."""

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=str(error),
    ) from error
