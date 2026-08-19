"""Grip domain model."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from simroll.models.control import ControlCategory


class Grip(BaseModel):
    """A physical control point that can constrain transitions."""

    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    grip_type: str = Field(min_length=1)
    category: ControlCategory = "limb_control"
    gi_allowed: bool = True
    no_gi_allowed: bool = True
    gi_required: bool
    control_target: str = Field(min_length=1)
    dominant_hand: str = Field(min_length=1)
    tags: list[str] = Field(default_factory=list)
    player_relationship: str = "owner controls opponent"
    owner_role_constraint: str = "any_engaged_player"
    description: str = "Runtime control."
    confidence: Literal["high", "medium", "low"] = "high"
    evidence_basis: str = "Runtime dataset metadata."
    source_ids: list[str] = Field(default_factory=list)
    source_references: list[str] = Field(default_factory=list)
