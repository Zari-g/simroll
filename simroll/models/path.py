"""Immutable result model for grappling pathways."""

from pydantic import BaseModel, ConfigDict, Field, model_validator

from simroll.models.state import GrapplingState


class GrapplingPath(BaseModel):
    """An immutable sequence of states connected by transition IDs."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    states: tuple[GrapplingState, ...] = Field(min_length=1)
    transition_ids: tuple[str, ...] = Field(default_factory=tuple)

    @model_validator(mode="after")
    def _validate_path_lengths(self) -> "GrapplingPath":
        if len(self.states) != len(self.transition_ids) + 1:
            raise ValueError(
                "A grappling path must contain exactly one more state than "
                "transition IDs."
            )
        return self

    @property
    def start_state(self) -> GrapplingState:
        """Return the first state in the path."""

        return self.states[0]

    @property
    def final_state(self) -> GrapplingState:
        """Return the final state in the path."""

        return self.states[-1]

    @property
    def step_count(self) -> int:
        """Return the number of transitions in the path."""

        return len(self.transition_ids)
