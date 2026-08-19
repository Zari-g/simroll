"""Typed Iteration 11A source and normalized dataset contracts.

These models belong to the import boundary. They deliberately do not replace
the runtime ``Position``, ``Transition``, ``Grip``, or ``GrapplingState``
models.
"""

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


Mode = Literal["gi", "no_gi"]
SourceMode = Literal["gi", "nogi"]
ModeClassification = Literal["A", "B", "C", "D", "E"]
ControlCategory = Literal["garment_grip", "limb_control", "body_control"]
Confidence = Literal["high", "medium", "low"]
PlayerTemplate = Literal["actor", "opponent"]


class StrictModel(BaseModel):
    """Base model that rejects misspelled or unexpected fields."""

    model_config = ConfigDict(extra="forbid")


class SourceRecord(StrictModel):
    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    url: str
    source_type: str = Field(min_length=1)
    license: str = Field(min_length=1)
    use_in_this_pass: str = Field(min_length=1)
    finding: str = Field(min_length=1)
    evidence_class: str = Field(min_length=1)


class SourcePosition(StrictModel):
    id: str = Field(min_length=1)
    display_name: str = Field(min_length=1)
    family: str = Field(min_length=1)
    player_a_role: str = Field(min_length=1)
    player_b_role: str = Field(min_length=1)
    gi_compatible: bool
    no_gi_compatible: bool
    terminal: bool
    source_ids: str
    source_reference: str
    evidence_status: str = Field(min_length=1)
    notes: str
    allowed_controls: list[str]
    common_controls: list[str]
    control_compatibility_note: str = Field(min_length=1)


class SourceAnyOfRequirement(StrictModel):
    match: Literal["any_of"]
    control_ids: list[str] = Field(min_length=1)
    owner: PlayerTemplate
    target: PlayerTemplate
    modes: list[SourceMode] = Field(min_length=1)


class SourceExactRequirement(StrictModel):
    match: Literal["exact"]
    control_id: str = Field(min_length=1)
    owner: PlayerTemplate
    target: PlayerTemplate


class SourceControlBinding(StrictModel):
    control_id: str = Field(min_length=1)
    owner: PlayerTemplate
    target: PlayerTemplate


class SourceResetControls(StrictModel):
    scope: Literal["all_except_explicit_preserved"]


class SourceTransition(StrictModel):
    id: str = Field(min_length=1)
    display_name: str = Field(min_length=1)
    source_position: str = Field(min_length=1)
    destination_position: str = Field(min_length=1)
    transition_type: str = Field(min_length=1)
    attacking_player: Literal["player_a", "player_b"]
    attacking_role: str = Field(min_length=1)
    gi_compatible: bool
    no_gi_compatible: bool
    required_control_or_grip: str
    resulting_control_or_grip: str
    submission: bool
    terminal: bool
    source_ids: str
    source_reference: str
    confidence: Confidence
    evidence_status: str = Field(min_length=1)
    notes: str
    modes: list[SourceMode] = Field(min_length=1)
    mode_classification: ModeClassification
    required_controls: list[SourceAnyOfRequirement]
    optional_controls: list[SourceControlBinding]
    controls_added: list[SourceControlBinding]
    controls_removed: list[SourceResetControls | SourceControlBinding]
    controls_preserved_if_valid: list[SourceControlBinding]
    garment_grip_required: bool
    mode_specific_notes: str
    player_a_role_before: str = Field(min_length=1)
    player_b_role_before: str = Field(min_length=1)
    player_a_role_after: str = Field(min_length=1)
    player_b_role_after: str = Field(min_length=1)
    role_change: bool
    role_effect: str = Field(min_length=1)
    control_owner_resolution: str = Field(min_length=1)
    split_variant_recommendation: Literal[
        "keep_unified", "manual_review_before_split"
    ]


class SourceControl(StrictModel):
    id: str = Field(min_length=1)
    display_name: str = Field(min_length=1)
    category: ControlCategory
    gi_allowed: bool
    nogi_allowed: bool
    player_relationship: str = Field(min_length=1)
    owner_role_constraint: str = Field(min_length=1)
    description: str = Field(min_length=1)
    source_ids: str
    source_reference: str
    confidence: Confidence
    evidence_basis: str = Field(min_length=1)


class SourceControlChangeTemplate(StrictModel):
    id: str = Field(min_length=1)
    display_name: str = Field(min_length=1)
    source_position: Literal["*live_position"]
    destination_position: Literal["same_as_source"]
    transition_type: Literal["control_change"]
    modes: list[SourceMode] = Field(min_length=1)
    parameter_control_ids: list[str] = Field(min_length=1)
    required_controls: list[SourceExactRequirement]
    controls_added: list[SourceControlBinding]
    controls_removed: list[SourceControlBinding]
    notes: str
    source_reference: str
    confidence: Confidence


class SourceOwnershipReview(StrictModel):
    transition_id: str = Field(min_length=1)
    transition_type: str = Field(min_length=1)
    actor_player: Literal["player_a", "player_b"]
    source_position: str = Field(min_length=1)
    destination_position: str = Field(min_length=1)
    player_a_role_before: str = Field(min_length=1)
    player_a_role_after: str = Field(min_length=1)
    player_b_role_before: str = Field(min_length=1)
    player_b_role_after: str = Field(min_length=1)
    role_effect: str = Field(min_length=1)
    ownership_rule: str = Field(min_length=1)


class SourceManualReview(StrictModel):
    transition_id: str = Field(min_length=1)
    display_name: str = Field(min_length=1)
    classification: ModeClassification
    current_decision: Literal["keep_unified", "manual_review_before_split"]
    review_question: str = Field(min_length=1)
    reason: str = Field(min_length=1)
    confidence: Confidence


class SourceExampleStep(StrictModel):
    sequence_id: str = Field(min_length=1)
    mode: SourceMode
    overall_step_number: int = Field(ge=1)
    positional_step_number: int | Literal[""]
    counts_as_positional_transition: bool
    position_before: str = Field(min_length=1)
    active_controls_before: str = Field(min_length=1)
    transition_id: str = Field(min_length=1)
    technique_or_control_change: str = Field(min_length=1)
    player_performing: Literal["player_a", "player_b"]
    resulting_position: str = Field(min_length=1)
    resulting_controls: str = Field(min_length=1)


class SourceExampleSequence(StrictModel):
    sequence_id: str = Field(min_length=1)
    mode: SourceMode
    seed: int
    start_position: str = Field(min_length=1)
    positional_transition_count: int = Field(ge=0)
    control_change_count: int = Field(ge=0)
    total_step_count: int = Field(ge=0)
    ended_in_submission: bool
    final_position: str = Field(min_length=1)
    steps: list[SourceExampleStep]


class SourceGraphValidation(StrictModel):
    generated_at: str = Field(min_length=1)
    graph_model: str = Field(min_length=1)
    node_count: int
    live_node_count: int
    terminal_node_count: int
    edge_count: int
    submission_edge_count: int
    submission_terminal_nodes: list[str]
    dead_ends: list[str]
    expected_dead_ends: list[str]
    unreachable_from_standing: list[str]
    strongly_connected_components: list[list[str]]
    largest_scc_size: int
    positions_supporting_10_plus_steps: list[str]
    outgoing_transitions_per_node: dict[str, int]
    transition_type_counts: dict[str, int]
    representative_cycles: list[list[str]]
    validation_errors: list[str]


class SourceModeValidation(StrictModel):
    mode: SourceMode
    positional_transition_count: int
    control_change_template_count: int
    gi_only_positional_transitions: int
    nogi_only_positional_transitions: int
    live_dead_ends: list[str]
    live_positions_with_zero_immediate_no_control_options: list[str]
    largest_scc_size: int
    all_live_nodes_in_one_scc: bool
    garment_control_errors: list[str]
    unsatisfiable_required_control_clauses: list[str]
    invalid_added_controls: list[str]
    invalid_preserved_controls: list[str]
    example_rolls: int
    examples_with_10_plus_positional_transitions: int
    outgoing_transitions_per_node: dict[str, int]
    immediate_no_control_outgoing_per_node: dict[str, int]
    validation_errors: list[str]


class SourceGripControlPass(StrictModel):
    design_status: str = Field(min_length=1)
    original_backbone_preserved: bool
    canonical_control_count: int
    positional_transition_count: int
    control_change_template_count: int
    mode_classification_counts: dict[ModeClassification, int]
    notes: list[str]


class SourceActiveControlInstance(StrictModel):
    required_fields: list[str]
    optional_fields: list[str]
    invariant: str = Field(min_length=1)


class SourceTransitionControlTemplate(StrictModel):
    owner_values: list[PlayerTemplate]
    resolution_time: str = Field(min_length=1)
    requirement_semantics: str = Field(min_length=1)


class SourceIntegrationModel(StrictModel):
    active_control_instance: SourceActiveControlInstance
    transition_control_template: SourceTransitionControlTemplate
    destination_validation_order: list[str]
    position_compatibility_recommendation: str = Field(min_length=1)
    conservative_reset_policy: str = Field(min_length=1)


class DeferredRecommendation(StrictModel):
    category: str = Field(min_length=1)
    examples: str = Field(min_length=1)
    reason: str = Field(min_length=1)


class SourceDataset(StrictModel):
    schema_version: str = Field(min_length=1)
    generated_at: str = Field(min_length=1)
    scope: str = Field(min_length=1)
    normalization_principles: list[str]
    sources: list[SourceRecord]
    positions: list[SourcePosition]
    transitions: list[SourceTransition]
    validation: SourceGraphValidation
    example_sequences: list[SourceExampleSequence]
    deferred_recommendations: list[DeferredRecommendation]
    grip_control_pass: SourceGripControlPass
    control_vocabulary: list[SourceControl]
    control_change_transitions: list[SourceControlChangeTemplate]
    integration_model: SourceIntegrationModel
    ownership_review: list[SourceOwnershipReview]
    mode_validation: dict[Literal["gi", "nogi"], SourceModeValidation]
    manual_review_transitions: list[SourceManualReview]


class Provenance(StrictModel):
    source_schema_version: str
    source_generated_at: str
    scope: str
    normalization_principles: list[str]
    sources: list[SourceRecord]


class RecordReferences(StrictModel):
    source_ids: list[str]
    source_references: list[str]
    evidence_status: str


class NormalizedPosition(StrictModel):
    id: str
    display_name: str
    family: str
    player_a_role: str
    player_b_role: str
    gi_allowed: bool
    no_gi_allowed: bool
    terminal: bool
    tags: list[str]
    notes: str
    allowed_controls: list[str]
    common_controls: list[str]
    control_compatibility_note: str
    references: RecordReferences


class ControlRequirement(StrictModel):
    match: Literal["any_of"]
    control_ids: list[str]
    owner: PlayerTemplate
    target: PlayerTemplate
    modes: list[Mode]


class ExactControlRequirement(StrictModel):
    match: Literal["exact"]
    control_id: str
    owner: PlayerTemplate
    target: PlayerTemplate


class ControlBinding(StrictModel):
    control_id: str
    owner: PlayerTemplate
    target: PlayerTemplate


class ResetControls(StrictModel):
    scope: Literal["all_except_explicit_preserved"]


class NormalizedTransition(StrictModel):
    id: str
    display_name: str
    source_position: str
    destination_position: str
    transition_type: str
    compatible_modes: list[Mode]
    gi_allowed: bool
    no_gi_allowed: bool
    required_controls: list[ControlRequirement]
    optional_controls: list[ControlBinding]
    controls_added: list[ControlBinding]
    controls_removed: list[ResetControls | ControlBinding]
    controls_preserved_if_valid: list[ControlBinding]
    submission: bool
    terminal: bool
    actor_player: Literal["player_a", "player_b"]
    actor_role: str
    player_a_role_before: str
    player_a_role_after: str
    player_b_role_before: str
    player_b_role_after: str
    role_change: bool
    role_effect: str
    control_owner_resolution: str
    mode_classification: ModeClassification
    garment_grip_required: bool
    mode_specific_notes: str
    split_variant_recommendation: Literal[
        "keep_unified", "manual_review_before_split"
    ]
    confidence: Confidence
    notes: str
    references: RecordReferences
    source_legacy_metadata: dict[str, str]


class NormalizedControl(StrictModel):
    id: str
    display_name: str
    category: ControlCategory
    gi_allowed: bool
    no_gi_allowed: bool
    player_relationship: str
    owner_role_constraint: str
    description: str
    confidence: Confidence
    evidence_basis: str
    references: RecordReferences


class NormalizedControlChangeTemplate(StrictModel):
    id: str
    display_name: str
    source_position_template: Literal["*live_position"]
    destination_position_template: Literal["same_as_source"]
    transition_type: Literal["control_change"]
    compatible_modes: list[Mode]
    parameter_control_ids: list[str]
    required_controls: list[ExactControlRequirement]
    controls_added: list[ControlBinding]
    controls_removed: list[ControlBinding]
    notes: str
    source_references: list[str]
    confidence: Confidence


class NormalizedExampleStep(SourceExampleStep):
    mode: Mode


class NormalizedExampleSequence(StrictModel):
    sequence_id: str
    mode: Mode
    seed: int
    start_position: str
    positional_transition_count: int
    control_change_count: int
    total_step_count: int
    ended_in_submission: bool
    final_position: str
    steps: list[NormalizedExampleStep]


class ReviewMetadata(StrictModel):
    ownership_sensitive_transitions: list[SourceOwnershipReview]
    manual_review_transitions: list[SourceManualReview]
    future_split_candidates: list[str]


class ValidationEvidence(StrictModel):
    source_graph_validation: SourceGraphValidation
    source_mode_validation: dict[Mode, SourceModeValidation]


class NormalizedDataset(StrictModel):
    contract_version: Literal["1.0.0"]
    dataset_version: Literal["simroll_bjj_mvp_v1"]
    provenance: Provenance
    positions: list[NormalizedPosition]
    positional_transitions: list[NormalizedTransition]
    controls: list[NormalizedControl]
    control_change_templates: list[NormalizedControlChangeTemplate]
    reviews: ReviewMetadata
    example_rolls: list[NormalizedExampleSequence]
    validation_evidence: ValidationEvidence
    integration_model: SourceIntegrationModel
    deferred_recommendations: list[DeferredRecommendation]
    source_summary: SourceGripControlPass
    import_metadata: dict[str, Any]
