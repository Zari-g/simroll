"""Grip domain model."""

from pydantic import BaseModel, ConfigDict, Field


class Grip(BaseModel):
    """A physical control point that can constrain transitions."""

    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    grip_type: str = Field(min_length=1)
    gi_required: bool
    control_target: str = Field(min_length=1)
    dominant_hand: str = Field(min_length=1)
    tags: list[str] = Field(default_factory=list)
