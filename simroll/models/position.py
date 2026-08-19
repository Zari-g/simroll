"""Position domain model."""

from pydantic import BaseModel, ConfigDict, Field


class Position(BaseModel):
    """A grappling position represented as a node in the SimRoll graph."""

    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    category: str = Field(min_length=1)
    player_role: str = Field(min_length=1)
    player_a_role: str = "unspecified"
    player_b_role: str = "unspecified"
    gi_allowed: bool
    no_gi_allowed: bool
    terminal: bool = False
    tags: list[str] = Field(default_factory=list)
    description: str = Field(min_length=1)
    allowed_controls: list[str] = Field(default_factory=list)
    common_controls: list[str] = Field(default_factory=list)
    control_compatibility_note: str = ""
    source_ids: list[str] = Field(default_factory=list)
    source_references: list[str] = Field(default_factory=list)
