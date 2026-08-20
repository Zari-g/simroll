"""Same-position, parameterized control-change actions."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from simroll.models.control import ActiveControl, PlayerId
from simroll.models.state import GrapplingMode


class ControlChangeTemplate(BaseModel):
    """One unexpanded control-change template from the normalized dataset."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    id: str = Field(min_length=1)
    display_name: str = Field(min_length=1)
    transition_type: Literal["control_change"]
    compatible_modes: tuple[GrapplingMode, ...] = Field(min_length=1)
    source_position_template: Literal["*live_position"]
    destination_position_template: Literal["same_as_source"]
    parameter_control_ids: tuple[str, ...] = Field(min_length=1)
    required_controls: tuple["TemplateControlReference", ...] = ()
    controls_added: tuple["TemplateControlReference", ...] = ()
    controls_removed: tuple["TemplateControlReference", ...] = ()
    notes: str = ""
    confidence: str = ""
    source_references: tuple[str, ...] = ()

    @model_validator(mode="after")
    def _validate_parameters(self) -> "ControlChangeTemplate":
        if len(set(self.compatible_modes)) != len(self.compatible_modes):
            raise ValueError("Compatible modes must be unique.")
        if len(set(self.parameter_control_ids)) != len(self.parameter_control_ids):
            raise ValueError("Parameter control IDs must be unique.")
        return self


class TemplateControlReference(BaseModel):
    """Validated actor/opponent reference retained in an unexpanded template."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    control_id: str = Field(pattern=r"^\$(control_id|from_control_id|to_control_id)$")
    owner: Literal["actor"]
    target: Literal["opponent"]
    match: Literal["exact"] | None = None


class ControlChange(BaseModel):
    """A fully resolved legal action that changes controls in place."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    action_type: Literal["control_change"] = "control_change"
    template_id: str = Field(min_length=1)
    position_id: str = Field(min_length=1)
    mode: GrapplingMode
    actor_player: PlayerId
    required_controls: tuple[ActiveControl, ...] = ()
    created_controls: tuple[ActiveControl, ...] = ()
    removed_controls: tuple[ActiveControl, ...] = ()
