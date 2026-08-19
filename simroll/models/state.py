"""Current grappling simulation state."""

from typing import Literal, cast

from pydantic import BaseModel, ConfigDict, Field, field_validator

from simroll.models.control import ActiveControl


GrapplingMode = Literal["gi", "no_gi"]


def validate_grappling_mode(mode: object) -> GrapplingMode:
    """Return a supported grappling mode or raise a clear error."""

    if mode not in ("gi", "no_gi"):
        raise ValueError(
            f"Unsupported grappling mode {mode!r}; expected 'gi' or 'no_gi'."
        )
    return cast(GrapplingMode, mode)


class GrapplingState(BaseModel):
    """An immutable snapshot with controls attached to stable players.

    Player identity remains stable for a roll. Top and bottom are positional
    roles derived from the current position, never player identities.
    """

    model_config = ConfigDict(extra="forbid", frozen=True)

    position_id: str = Field(min_length=1)
    mode: GrapplingMode
    active_controls: frozenset[ActiveControl] = Field(default_factory=frozenset)

    @field_validator("mode", mode="before")
    @classmethod
    def _validate_mode(cls, mode: object) -> GrapplingMode:
        return validate_grappling_mode(mode)
