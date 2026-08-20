"""Transition domain model."""

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from simroll.models.control import ActiveControl, OwnedControlRequirement, PlayerId


class Transition(BaseModel):
    """A directed movement between two positions in the SimRoll graph."""

    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    action_type: Literal["transition"] = "transition"
    from_position: str = Field(min_length=1)
    to_position: str = Field(min_length=1)
    transition_type: str = Field(min_length=1)
    actor_player: PlayerId = "player_a"
    required_grips: list[str] = Field(default_factory=list)
    created_grips: list[str] = Field(default_factory=list)
    removed_grips: list[str] = Field(default_factory=list)
    required_controls: list[OwnedControlRequirement] = Field(default_factory=list)
    created_controls: list[ActiveControl] = Field(default_factory=list)
    removed_controls: list[ActiveControl] = Field(default_factory=list)
    optional_controls: list[ActiveControl] = Field(default_factory=list)
    controls_preserved_if_valid: list[ActiveControl] = Field(default_factory=list)
    reset_controls: bool = False
    gi_allowed: bool
    no_gi_allowed: bool
    difficulty: str = Field(min_length=1)
    tags: list[str] = Field(default_factory=list)
    notes: str = ""
    submission: bool = False
    terminal: bool = False
    ownership_review_required: bool = False
    control_owner_resolution: str = ""
    mode_classification: Literal["A", "B", "C", "D", "E"] = "A"
    metadata: dict[str, Any] = Field(default_factory=dict)
