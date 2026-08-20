"""Bounded roll simulation results with explicit event accounting."""

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from simroll.models.control_change import ControlChange
from simroll.models.state import GrapplingState
from simroll.models.transition import Transition

RollAction = Annotated[
    Transition | ControlChange,
    Field(discriminator="action_type"),
]

SimulationStopReason = Literal[
    "submission",
    "max_steps",
    "no_available_transitions",
]


class RollSimulation(BaseModel):
    """Immutable states and actions produced by a bounded simulation."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    states: tuple[GrapplingState, ...] = Field(min_length=1)
    actions: tuple[RollAction, ...] = ()
    stop_reason: SimulationStopReason

    @model_validator(mode="after")
    def _validate_lengths(self) -> "RollSimulation":
        if len(self.states) != len(self.actions) + 1:
            raise ValueError("A simulation must have one more state than actions.")
        if self.stop_reason == "submission" and (
            not self.actions
            or not isinstance(self.actions[-1], Transition)
            or not self.actions[-1].submission
            or self.states[-1].position_id != "submission_terminal"
        ):
            raise ValueError(
                "A submission stop requires an executed submission transition."
            )
        return self

    @property
    def submission_transition(self) -> Transition | None:
        """Return the executed submission that ended the roll, if any."""

        if self.stop_reason != "submission":
            return None
        action = self.actions[-1]
        return action if isinstance(action, Transition) else None

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
