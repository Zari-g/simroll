"""Player-owned grappling controls."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


PlayerId = Literal["player_a", "player_b"]
ControlCategory = Literal["garment_grip", "limb_control", "body_control"]


class ActiveControl(BaseModel):
    """An immutable control held by one stable player over the other."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    control_id: str = Field(min_length=1)
    owner: PlayerId
    target: PlayerId

    @model_validator(mode="after")
    def _players_must_differ(self) -> "ActiveControl":
        if self.owner == self.target:
            raise ValueError("Control owner and target must be different players.")
        return self


class OwnedControlRequirement(BaseModel):
    """One mode-scoped any-of requirement resolved to stable player IDs."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    match: Literal["any_of"] = "any_of"
    control_ids: tuple[str, ...] = Field(min_length=1)
    owner: PlayerId
    target: PlayerId
    modes: tuple[Literal["gi", "no_gi"], ...] = Field(min_length=1)

    @model_validator(mode="after")
    def _validate_requirement(self) -> "OwnedControlRequirement":
        if self.owner == self.target:
            raise ValueError("Control requirement owner and target must differ.")
        if len(set(self.control_ids)) != len(self.control_ids):
            raise ValueError("Control requirement IDs must be unique.")
        if len(set(self.modes)) != len(self.modes):
            raise ValueError("Control requirement modes must be unique.")
        return self
