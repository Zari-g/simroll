"""Bounded roll simulation results with explicit event accounting."""

from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, model_validator

from simroll.models.control_change import ControlChange
from simroll.models.state import GrapplingState
from simroll.models.transition import Transition

RollAction = Annotated[
    Transition | ControlChange,
    Field(discriminator="action_type"),
]


class RollSimulation(BaseModel):
    """Immutable states and actions produced by a bounded simulation."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    states: tuple[GrapplingState, ...] = Field(min_length=1)
    actions: tuple[RollAction, ...] = ()

    @model_validator(mode="after")
    def _validate_lengths(self) -> "RollSimulation":
        if len(self.states) != len(self.actions) + 1:
            raise ValueError("A simulation must have one more state than actions.")
        return self

    @property
    def positional_steps(self) -> int:
        return sum(action.action_type == "transition" for action in self.actions)

    @property
    def control_actions(self) -> int:
        return sum(action.action_type == "control_change" for action in self.actions)

    @property
    def total_events(self) -> int:
        return len(self.actions)

    @property
    def action_ids(self) -> tuple[str, ...]:
        return tuple(action.id for action in self.actions)

    @property
    def transition_ids(self) -> tuple[str, ...]:
        """Legacy event-ID alias retained for existing roll consumers."""

        return self.action_ids

    @property
    def step_count(self) -> int:
        """Legacy total-event alias; new code should use explicit counters."""

        return self.total_events
