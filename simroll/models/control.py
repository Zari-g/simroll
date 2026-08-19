"""Player-owned grappling controls."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


PlayerId = Literal["player_a", "player_b"]


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
