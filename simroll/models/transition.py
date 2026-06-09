"""Transition domain model."""

from pydantic import BaseModel, ConfigDict, Field


class Transition(BaseModel):
    """A directed movement between two positions in the SimRoll graph."""

    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    from_position: str = Field(min_length=1)
    to_position: str = Field(min_length=1)
    transition_type: str = Field(min_length=1)
    required_grips: list[str] = Field(default_factory=list)
    created_grips: list[str] = Field(default_factory=list)
    removed_grips: list[str] = Field(default_factory=list)
    gi_allowed: bool
    no_gi_allowed: bool
    difficulty: str = Field(min_length=1)
    tags: list[str] = Field(default_factory=list)
    notes: str = ""
