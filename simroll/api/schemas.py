"""Transport models for SimRoll state, pathfinding, and roll endpoints."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from simroll.models import (
    ActiveControl,
    GrapplingMode,
    GrapplingPath,
    GrapplingState,
    Transition,
)


class AvailableTransitionsRequest(BaseModel):
    """Describe the current state used to filter outgoing transitions."""

    model_config = ConfigDict(extra="forbid")

    position_id: str = Field(
        min_length=1,
        description="ID of the current grappling position.",
    )
    mode: GrapplingMode = Field(description="Grappling mode for the state.")
    active_controls: list[ActiveControl] = Field(
        default_factory=list,
        description="Player-owned controls currently active in the state.",
    )


class ShortestPathRequest(BaseModel):
    """Parameters for finding the shortest path to a position."""

    model_config = ConfigDict(extra="forbid")

    start_state: GrapplingState
    target_position_id: str = Field(
        min_length=1,
        description="ID of the desired final position.",
    )
    difficulties: list[str] | None = Field(
        default=None,
        description="Allowed transition difficulties, or null for any.",
    )
    transition_types: list[str] | None = Field(
        default=None,
        description="Allowed transition types, or null for any.",
    )
    max_depth: int | None = Field(
        default=None,
        description="Maximum transition count, or null for no limit.",
    )


class PathsRequest(BaseModel):
    """Parameters for finding multiple paths to a position."""

    model_config = ConfigDict(extra="forbid")

    start_state: GrapplingState
    target_position_id: str = Field(
        min_length=1,
        description="ID of the desired final position.",
    )
    difficulties: list[str] | None = Field(
        default=None,
        description="Allowed transition difficulties, or null for any.",
    )
    transition_types: list[str] | None = Field(
        default=None,
        description="Allowed transition types, or null for any.",
    )
    max_paths: int = Field(
        default=10,
        description="Maximum number of paths to return.",
    )
    max_depth: int = Field(
        default=10,
        description="Maximum transition count for each path.",
    )


class GrapplingStateResponse(BaseModel):
    """Stable HTTP representation of an immutable grappling state."""

    position_id: str
    mode: GrapplingMode
    active_controls: list[ActiveControl]

    @classmethod
    def from_domain(cls, state: GrapplingState) -> "GrapplingStateResponse":
        """Convert a domain state with deterministically ordered controls."""

        return cls(
            position_id=state.position_id,
            mode=state.mode,
            active_controls=sorted(
                state.active_controls,
                key=lambda item: (item.control_id, item.owner, item.target),
            ),
        )


class GrapplingPathResponse(BaseModel):
    """Stable HTTP representation of a pathfinding result."""

    states: list[GrapplingStateResponse]
    transition_ids: list[str]
    step_count: int

    @classmethod
    def from_domain(cls, path: GrapplingPath) -> "GrapplingPathResponse":
        """Convert a domain path without changing its state order."""

        return cls(
            states=[
                GrapplingStateResponse.from_domain(state)
                for state in path.states
            ],
            transition_ids=list(path.transition_ids),
            step_count=path.step_count,
        )


class ShortestPathResponse(BaseModel):
    """Envelope for a shortest-path search result."""

    path: GrapplingPathResponse | None


class PathsResponse(BaseModel):
    """Envelope for a multiple-path search result."""

    paths: list[GrapplingPathResponse]


class RollAvailableRequest(BaseModel):
    """Complete grappling state used to list the next roll choices."""

    model_config = ConfigDict(extra="forbid")

    state: GrapplingState


class RollStepRequest(BaseModel):
    """Parameters for one selected or random roll step."""

    model_config = ConfigDict(extra="forbid")

    state: GrapplingState
    transition_id: str | None = Field(
        default=None,
        min_length=1,
        description="Selected transition ID, or null to choose at random.",
    )


class RollStepResponse(BaseModel):
    """Outcome of one roll step; both fields are null at a dead end."""

    transition: Transition | None
    next_state: GrapplingStateResponse | None


class RollSimulationRequest(BaseModel):
    """Parameters for a bounded random roll sequence."""

    model_config = ConfigDict(extra="forbid")

    start_state: GrapplingState
    max_steps: int = Field(
        ge=0,
        description="Maximum number of random roll transitions to perform.",
    )


class RollSimulationResponse(BaseModel):
    """Authoritative simulated path and the reason it stopped."""

    path: GrapplingPathResponse
    stop_reason: Literal["max_steps", "no_available_transitions"]
