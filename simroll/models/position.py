"""Position domain model."""

from pydantic import BaseModel, ConfigDict, Field


class Position(BaseModel):
    """A grappling position represented as a node in the SimRoll graph."""

    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    category: str = Field(min_length=1)
    player_role: str = Field(min_length=1)
    gi_allowed: bool
    no_gi_allowed: bool
    tags: list[str] = Field(default_factory=list)
    description: str = Field(min_length=1)
