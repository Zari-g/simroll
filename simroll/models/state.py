"""Current grappling simulation state."""

from typing import Literal, cast

from pydantic import BaseModel, ConfigDict, Field, field_validator


GrapplingMode = Literal["gi", "no_gi"]


def validate_grappling_mode(mode: object) -> GrapplingMode:
    """Return a supported grappling mode or raise a clear error."""

    if mode not in ("gi", "no_gi"):
        raise ValueError(
            f"Unsupported grappling mode {mode!r}; expected 'gi' or 'no_gi'."
        )
    return cast(GrapplingMode, mode)


class GrapplingState(BaseModel):
    """An immutable snapshot of a roll's position, mode, and active grips."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    position_id: str = Field(min_length=1)
    mode: GrapplingMode
    active_grips: frozenset[str] = Field(default_factory=frozenset)

    @field_validator("mode", mode="before")
    @classmethod
    def _validate_mode(cls, mode: object) -> GrapplingMode:
        return validate_grappling_mode(mode)
