"""Deterministic importer for the curated SimRoll BJJ MVP dataset."""

from __future__ import annotations

import hashlib
import json
from collections import Counter
from pathlib import Path
from typing import Iterable

import networkx as nx

from simroll.datasets.contract import (
    ControlBinding,
    ControlRequirement,
    ExactControlRequirement,
    Mode,
    NormalizedControl,
    NormalizedControlChangeTemplate,
    NormalizedDataset,
    NormalizedExampleSequence,
    NormalizedExampleStep,
    NormalizedPosition,
    NormalizedTransition,
    Provenance,
    RecordReferences,
    ResetControls,
    ReviewMetadata,
    SourceControlBinding,
    SourceDataset,
    SourceMode,
    ValidationEvidence,
)


CONTRACT_VERSION = "1.0.0"
DATASET_VERSION = "simroll_bjj_mvp_v1"


class DatasetValidationError(ValueError):
    """Raised when curated source data violates the Iteration 11A contract."""


def load_source_dataset(path: Path | str) -> SourceDataset:
    """Parse one authoritative source JSON file through the typed source contract."""

    source_path = Path(path)
    with source_path.open("r", encoding="utf-8-sig") as source_file:
        raw_data = json.load(source_file)
    return SourceDataset.model_validate(raw_data)


def load_normalized_dataset(path: Path | str) -> NormalizedDataset:
    """Load and validate a generated normalized artifact."""

    normalized_path = Path(path)
    with normalized_path.open("r", encoding="utf-8") as normalized_file:
        raw_data = json.load(normalized_file)
    return NormalizedDataset.model_validate(raw_data)


def validate_dataset(dataset: SourceDataset) -> None:
    """Validate relationships, metadata coherence, and the approved MVP baseline."""

    position_ids = _unique_ids(dataset.positions, "position")
    transition_ids = _unique_ids(dataset.transitions, "transition")
    control_ids = _unique_ids(dataset.control_vocabulary, "control")
    template_ids = _unique_ids(
        dataset.control_change_transitions, "control-change template"
    )
    _unique_review_ids(dataset.ownership_review, "ownership review")
    _unique_review_ids(dataset.manual_review_transitions, "manual review")
    _unique_sequence_ids(dataset.example_sequences)

    for position in sorted(dataset.positions, key=lambda item: item.id):
        _require_known_controls(
            position.id,
            "allowed_controls",
            position.allowed_controls,
            control_ids,
        )
        _require_known_controls(
            position.id,
            "common_controls",
            position.common_controls,
            control_ids,
        )

    transitions_by_id = {item.id: item for item in dataset.transitions}
    for transition in sorted(dataset.transitions, key=lambda item: item.id):
        _require_known_position(
            transition.id,
            "source_position",
            transition.source_position,
            position_ids,
        )
        _require_known_position(
            transition.id,
            "destination_position",
            transition.destination_position,
            position_ids,
        )
        _validate_transition_controls(transition, control_ids)
        _validate_transition_modes(transition)

    for template in sorted(
        dataset.control_change_transitions, key=lambda item: item.id
    ):
        _require_known_controls(
            template.id,
            "parameter_control_ids",
            template.parameter_control_ids,
            control_ids,
        )
        for field_name in ("required_controls", "controls_added", "controls_removed"):
            for item in getattr(template, field_name):
                control_id = item.control_id
                if not control_id.startswith("$") and control_id not in control_ids:
                    raise DatasetValidationError(
                        f"Control-change template '{template.id}' references unknown "
                        f"control '{control_id}' in {field_name}."
                    )

    for review in sorted(
        dataset.manual_review_transitions, key=lambda item: item.transition_id
    ):
        _require_review_transition(review.transition_id, "Manual review", transition_ids)
        transition = transitions_by_id[review.transition_id]
        if review.classification != transition.mode_classification:
            raise DatasetValidationError(
                f"Manual review '{review.transition_id}' classification "
                f"'{review.classification}' does not match transition classification "
                f"'{transition.mode_classification}'."
            )

    for review in sorted(
        dataset.ownership_review, key=lambda item: item.transition_id
    ):
        _require_review_transition(
            review.transition_id, "Ownership review", transition_ids
        )
        transition = transitions_by_id[review.transition_id]
        if (
            review.source_position != transition.source_position
            or review.destination_position != transition.destination_position
        ):
            raise DatasetValidationError(
                f"Ownership review '{review.transition_id}' does not match its "
                "transition endpoints."
            )

    _validate_examples(dataset, position_ids, transition_ids, template_ids)
    _validate_terminal_metadata(dataset)
    _validate_baseline_counts(dataset)
    _validate_graph_invariants(dataset)
    _validate_source_summaries(dataset)


def normalize_dataset(
    dataset: SourceDataset, *, source_sha256: str = ""
) -> NormalizedDataset:
    """Return stable normalized data without mutating the parsed source."""

    validate_dataset(dataset)

    positions = [
        NormalizedPosition(
            id=item.id,
            display_name=item.display_name,
            family=item.family,
            player_a_role=item.player_a_role,
            player_b_role=item.player_b_role,
            gi_allowed=item.gi_compatible,
            no_gi_allowed=item.no_gi_compatible,
            terminal=item.terminal,
            tags=[],
            notes=item.notes,
            allowed_controls=sorted(item.allowed_controls),
            common_controls=sorted(item.common_controls),
            control_compatibility_note=item.control_compatibility_note,
            references=_references(
                item.source_ids, item.source_reference, item.evidence_status
            ),
        )
        for item in sorted(dataset.positions, key=lambda value: value.id)
    ]

    transitions = [
        NormalizedTransition(
            id=item.id,
            display_name=item.display_name,
            source_position=item.source_position,
            destination_position=item.destination_position,
            transition_type=item.transition_type,
            compatible_modes=_normalized_modes(item.modes),
            gi_allowed=item.gi_compatible,
            no_gi_allowed=item.no_gi_compatible,
            required_controls=[
                ControlRequirement(
                    match=requirement.match,
                    control_ids=sorted(requirement.control_ids),
                    owner=requirement.owner,
                    target=requirement.target,
                    modes=_normalized_modes(requirement.modes),
                )
                for requirement in item.required_controls
            ],
            optional_controls=_bindings(item.optional_controls),
            controls_added=_bindings(item.controls_added),
            controls_removed=[
                ResetControls(scope=removal.scope)
                if hasattr(removal, "scope")
                else ControlBinding(**removal.model_dump())
                for removal in item.controls_removed
            ],
            controls_preserved_if_valid=_bindings(
                item.controls_preserved_if_valid
            ),
            submission=item.submission,
            terminal=item.terminal,
            actor_player=item.attacking_player,
            actor_role=item.attacking_role,
            player_a_role_before=item.player_a_role_before,
            player_a_role_after=item.player_a_role_after,
            player_b_role_before=item.player_b_role_before,
            player_b_role_after=item.player_b_role_after,
            role_change=item.role_change,
            role_effect=item.role_effect,
            control_owner_resolution=item.control_owner_resolution,
            mode_classification=item.mode_classification,
            garment_grip_required=item.garment_grip_required,
            mode_specific_notes=item.mode_specific_notes,
            split_variant_recommendation=item.split_variant_recommendation,
            confidence=item.confidence,
            notes=item.notes,
            references=_references(
                item.source_ids, item.source_reference, item.evidence_status
            ),
            source_legacy_metadata={
                "required_control_or_grip": item.required_control_or_grip,
                "resulting_control_or_grip": item.resulting_control_or_grip,
            },
        )
        for item in sorted(dataset.transitions, key=lambda value: value.id)
    ]

    controls = [
        NormalizedControl(
            id=item.id,
            display_name=item.display_name,
            category=item.category,
            gi_allowed=item.gi_allowed,
            no_gi_allowed=item.nogi_allowed,
            player_relationship=item.player_relationship,
            owner_role_constraint=item.owner_role_constraint,
            description=item.description,
            confidence=item.confidence,
            evidence_basis=item.evidence_basis,
            references=_references(
                item.source_ids, item.source_reference, item.evidence_basis
            ),
        )
        for item in sorted(dataset.control_vocabulary, key=lambda value: value.id)
    ]

    templates = [
        NormalizedControlChangeTemplate(
            id=item.id,
            display_name=item.display_name,
            source_position_template=item.source_position,
            destination_position_template=item.destination_position,
            transition_type=item.transition_type,
            compatible_modes=_normalized_modes(item.modes),
            parameter_control_ids=sorted(item.parameter_control_ids),
            required_controls=[
                ExactControlRequirement(**requirement.model_dump())
                for requirement in item.required_controls
            ],
            controls_added=_bindings(item.controls_added),
            controls_removed=_bindings(item.controls_removed),
            notes=item.notes,
            source_references=_split_references(item.source_reference),
            confidence=item.confidence,
        )
        for item in sorted(
            dataset.control_change_transitions, key=lambda value: value.id
        )
    ]

    examples = [
        NormalizedExampleSequence(
            sequence_id=item.sequence_id,
            mode=_normalize_mode(item.mode),
            seed=item.seed,
            start_position=item.start_position,
            positional_transition_count=item.positional_transition_count,
            control_change_count=item.control_change_count,
            total_step_count=item.total_step_count,
            ended_in_submission=item.ended_in_submission,
            final_position=item.final_position,
            steps=[
                NormalizedExampleStep(
                    **step.model_dump(exclude={"mode"}),
                    mode=_normalize_mode(step.mode),
                )
                for step in sorted(
                    item.steps, key=lambda value: value.overall_step_number
                )
            ],
        )
        for item in sorted(dataset.example_sequences, key=lambda value: value.sequence_id)
    ]

    split_candidates = sorted(
        item.id
        for item in dataset.transitions
        if item.split_variant_recommendation == "manual_review_before_split"
    )

    return NormalizedDataset(
        contract_version=CONTRACT_VERSION,
        dataset_version=DATASET_VERSION,
        provenance=Provenance(
            source_schema_version=dataset.schema_version,
            source_generated_at=dataset.generated_at,
            scope=dataset.scope,
            normalization_principles=list(dataset.normalization_principles),
            sources=sorted(dataset.sources, key=lambda value: value.id),
        ),
        positions=positions,
        positional_transitions=transitions,
        controls=controls,
        control_change_templates=templates,
        reviews=ReviewMetadata(
            ownership_sensitive_transitions=sorted(
                dataset.ownership_review, key=lambda value: value.transition_id
            ),
            manual_review_transitions=sorted(
                dataset.manual_review_transitions,
                key=lambda value: value.transition_id,
            ),
            future_split_candidates=split_candidates,
        ),
        example_rolls=examples,
        validation_evidence=ValidationEvidence(
            source_graph_validation=dataset.validation,
            source_mode_validation={
                _normalize_mode(key): value
                for key, value in sorted(dataset.mode_validation.items())
            },
        ),
        integration_model=dataset.integration_model,
        deferred_recommendations=list(dataset.deferred_recommendations),
        source_summary=dataset.grip_control_pass,
        import_metadata={
            "source_artifact": "simroll_bjj_mvp.json",
            "source_sha256": source_sha256,
            "mode_normalization": {"nogi": "no_gi"},
            "id_policy": "preserved_exactly",
            "ordering": "records_by_stable_id",
        },
    )


def import_dataset(source_path: Path | str, output_path: Path | str) -> NormalizedDataset:
    """Parse, validate, normalize, and write one canonical JSON artifact."""

    source = Path(source_path)
    output = Path(output_path)
    source_bytes = source.read_bytes()
    dataset = load_source_dataset(source)
    normalized = normalize_dataset(
        dataset, source_sha256=hashlib.sha256(source_bytes).hexdigest()
    )
    serialized = json.dumps(
        normalized.model_dump(mode="json"),
        ensure_ascii=False,
        indent=2,
        sort_keys=True,
    ) + "\n"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(serialized, encoding="utf-8", newline="\n")
    return normalized


def _unique_ids(records: Iterable[object], label: str) -> set[str]:
    seen: set[str] = set()
    for record in records:
        record_id = getattr(record, "id")
        if record_id in seen:
            raise DatasetValidationError(f"Duplicate {label} ID '{record_id}'.")
        seen.add(record_id)
    return seen


def _unique_review_ids(records: Iterable[object], label: str) -> None:
    seen: set[str] = set()
    for record in records:
        transition_id = getattr(record, "transition_id")
        if transition_id in seen:
            raise DatasetValidationError(
                f"Duplicate {label} transition ID '{transition_id}'."
            )
        seen.add(transition_id)


def _unique_sequence_ids(sequences: Iterable[object]) -> None:
    seen: set[str] = set()
    for sequence in sequences:
        sequence_id = getattr(sequence, "sequence_id")
        if sequence_id in seen:
            raise DatasetValidationError(
                f"Duplicate example sequence ID '{sequence_id}'."
            )
        seen.add(sequence_id)


def _require_known_position(
    record_id: str, field_name: str, position_id: str, position_ids: set[str]
) -> None:
    if position_id not in position_ids:
        raise DatasetValidationError(
            f"Transition '{record_id}' references unknown position "
            f"'{position_id}' in {field_name}."
        )


def _require_known_controls(
    record_id: str,
    field_name: str,
    referenced_ids: Iterable[str],
    control_ids: set[str],
) -> None:
    for control_id in sorted(referenced_ids):
        if control_id not in control_ids:
            raise DatasetValidationError(
                f"Record '{record_id}' references unknown control "
                f"'{control_id}' in {field_name}."
            )


def _validate_transition_controls(transition: object, control_ids: set[str]) -> None:
    for requirement in transition.required_controls:
        _require_known_controls(
            transition.id,
            "required_controls",
            requirement.control_ids,
            control_ids,
        )
    for field_name in (
        "optional_controls",
        "controls_added",
        "controls_removed",
        "controls_preserved_if_valid",
    ):
        _require_known_controls(
            transition.id,
            field_name,
            (
                item.control_id
                for item in getattr(transition, field_name)
                if hasattr(item, "control_id")
            ),
            control_ids,
        )


def _validate_transition_modes(transition: object) -> None:
    modes = set(transition.modes)
    expected = {
        mode
        for mode, allowed in (
            ("gi", transition.gi_compatible),
            ("nogi", transition.no_gi_compatible),
        )
        if allowed
    }
    if modes != expected:
        raise DatasetValidationError(
            f"Transition '{transition.id}' modes {sorted(modes)} do not match "
            f"compatibility flags {sorted(expected)}."
        )
    for requirement in transition.required_controls:
        if not set(requirement.modes).issubset(modes):
            raise DatasetValidationError(
                f"Transition '{transition.id}' has a required control clause for "
                "an incompatible mode."
            )


def _require_review_transition(
    transition_id: str, label: str, transition_ids: set[str]
) -> None:
    if transition_id not in transition_ids:
        raise DatasetValidationError(
            f"{label} references unknown transition '{transition_id}'."
        )


def _validate_examples(
    dataset: SourceDataset,
    position_ids: set[str],
    transition_ids: set[str],
    template_ids: set[str],
) -> None:
    action_ids = transition_ids | template_ids
    transitions_by_id = {item.id: item for item in dataset.transitions}
    mode_counts = Counter(sequence.mode for sequence in dataset.example_sequences)
    if dict(mode_counts) != {"gi": 5, "nogi": 5}:
        raise DatasetValidationError(
            "Expected five Gi and five No-Gi example sequences; "
            f"found {dict(mode_counts)}."
        )
    for sequence in sorted(dataset.example_sequences, key=lambda item: item.sequence_id):
        if sequence.start_position not in position_ids:
            raise DatasetValidationError(
                f"Example sequence '{sequence.sequence_id}' starts at unknown "
                f"position '{sequence.start_position}'."
            )
        if sequence.final_position not in position_ids:
            raise DatasetValidationError(
                f"Example sequence '{sequence.sequence_id}' ends at unknown "
                f"position '{sequence.final_position}'."
            )
        if sequence.total_step_count != len(sequence.steps):
            raise DatasetValidationError(
                f"Example sequence '{sequence.sequence_id}' total_step_count does "
                "not match its steps."
            )
        positional_steps = [
            step for step in sequence.steps if step.counts_as_positional_transition
        ]
        if len(positional_steps) != sequence.positional_transition_count:
            raise DatasetValidationError(
                f"Example sequence '{sequence.sequence_id}' positional count does "
                "not match its steps."
            )
        if len(sequence.steps) - len(positional_steps) != sequence.control_change_count:
            raise DatasetValidationError(
                f"Example sequence '{sequence.sequence_id}' control-change count "
                "does not match its steps."
            )
        if sequence.positional_transition_count < 10:
            raise DatasetValidationError(
                f"Example sequence '{sequence.sequence_id}' has fewer than ten "
                "positional transitions."
            )
        expected_position = sequence.start_position
        expected_positional_number = 1
        for expected_overall_number, step in enumerate(sequence.steps, start=1):
            if step.sequence_id != sequence.sequence_id or step.mode != sequence.mode:
                raise DatasetValidationError(
                    f"Example sequence '{sequence.sequence_id}' contains mismatched "
                    "step metadata."
                )
            if step.overall_step_number != expected_overall_number:
                raise DatasetValidationError(
                    f"Example sequence '{sequence.sequence_id}' has non-contiguous "
                    "overall step numbers."
                )
            if step.position_before != expected_position:
                raise DatasetValidationError(
                    f"Example sequence '{sequence.sequence_id}' is discontinuous at "
                    f"step {step.overall_step_number}."
                )
            if step.transition_id not in action_ids:
                raise DatasetValidationError(
                    f"Example sequence '{sequence.sequence_id}' references unknown "
                    f"action '{step.transition_id}'."
                )
            for position_id in (step.position_before, step.resulting_position):
                if position_id not in position_ids:
                    raise DatasetValidationError(
                        f"Example sequence '{sequence.sequence_id}' references "
                        f"unknown position '{position_id}'."
                    )
            if step.counts_as_positional_transition:
                transition = transitions_by_id[step.transition_id]
                if step.positional_step_number != expected_positional_number:
                    raise DatasetValidationError(
                        f"Example sequence '{sequence.sequence_id}' has invalid "
                        "positional step numbering."
                    )
                if (
                    transition.source_position != step.position_before
                    or transition.destination_position != step.resulting_position
                ):
                    raise DatasetValidationError(
                        f"Example sequence '{sequence.sequence_id}' step "
                        f"{step.overall_step_number} does not match transition "
                        f"'{step.transition_id}' endpoints."
                    )
                expected_positional_number += 1
            else:
                if step.transition_id not in template_ids:
                    raise DatasetValidationError(
                        f"Example sequence '{sequence.sequence_id}' marks positional "
                        f"transition '{step.transition_id}' as a control change."
                    )
                if step.positional_step_number != "":
                    raise DatasetValidationError(
                        f"Example sequence '{sequence.sequence_id}' has a positional "
                        "number on a control-change step."
                    )
                if step.resulting_position != step.position_before:
                    raise DatasetValidationError(
                        f"Example sequence '{sequence.sequence_id}' control-change "
                        "step changes position."
                    )
            expected_position = step.resulting_position
        if expected_position != sequence.final_position:
            raise DatasetValidationError(
                f"Example sequence '{sequence.sequence_id}' final position does not "
                "match its last step."
            )
        if sequence.ended_in_submission != (
            sequence.final_position == "submission_terminal"
        ):
            raise DatasetValidationError(
                f"Example sequence '{sequence.sequence_id}' has inconsistent "
                "submission metadata."
            )


def _validate_terminal_metadata(dataset: SourceDataset) -> None:
    terminal_ids = sorted(item.id for item in dataset.positions if item.terminal)
    if terminal_ids != ["submission_terminal"]:
        raise DatasetValidationError(
            "Expected submission_terminal to be the only terminal position; "
            f"found {terminal_ids}."
        )
    for transition in dataset.transitions:
        expected_terminal = transition.destination_position == "submission_terminal"
        if transition.terminal != expected_terminal:
            raise DatasetValidationError(
                f"Transition '{transition.id}' has malformed terminal metadata."
            )
        if transition.submission != (transition.transition_type == "submission"):
            raise DatasetValidationError(
                f"Transition '{transition.id}' has malformed submission metadata."
            )
        if transition.submission != transition.terminal:
            raise DatasetValidationError(
                f"Transition '{transition.id}' submission and terminal flags disagree."
            )


def _validate_baseline_counts(dataset: SourceDataset) -> None:
    checks = {
        "positions": (len(dataset.positions), 20),
        "live positions": (sum(not item.terminal for item in dataset.positions), 19),
        "submission terminal positions": (
            sum(item.id == "submission_terminal" and item.terminal for item in dataset.positions),
            1,
        ),
        "original positional transitions": (len(dataset.transitions), 65),
        "submission transitions": (sum(item.submission for item in dataset.transitions), 10),
        "controls": (len(dataset.control_vocabulary), 17),
        "control-change templates": (len(dataset.control_change_transitions), 5),
        "manual-review transitions": (len(dataset.manual_review_transitions), 11),
        "ownership-reviewed transitions": (len(dataset.ownership_review), 30),
    }
    for label, (actual, expected) in checks.items():
        if actual != expected:
            raise DatasetValidationError(
                f"Expected {expected} {label}, found {actual}."
            )

    category_counts = Counter(item.category for item in dataset.control_vocabulary)
    expected_categories = {
        "garment_grip": 5,
        "limb_control": 5,
        "body_control": 7,
    }
    if dict(category_counts) != expected_categories:
        raise DatasetValidationError(
            f"Expected control category counts {expected_categories}, found "
            f"{dict(category_counts)}."
        )

    split_ids = sorted(
        item.id
        for item in dataset.transitions
        if item.split_variant_recommendation == "manual_review_before_split"
    )
    expected_splits = [
        "half_guard_bottom_old_school_sweep_to_side_control_top",
        "open_guard_top_toreando_to_side_control_top",
    ]
    if split_ids != expected_splits:
        raise DatasetValidationError(
            f"Expected future split candidates {expected_splits}, found {split_ids}."
        )


def _validate_graph_invariants(dataset: SourceDataset) -> None:
    graph = nx.DiGraph()
    graph.add_nodes_from(item.id for item in dataset.positions)
    graph.add_edges_from(
        (item.source_position, item.destination_position)
        for item in dataset.transitions
    )
    live_ids = {item.id for item in dataset.positions if not item.terminal}
    live_graph = graph.subgraph(live_ids)
    components = list(nx.strongly_connected_components(live_graph))
    if len(components) != 1 or components[0] != live_ids:
        raise DatasetValidationError(
            "Expected all 19 live positions to form one strongly connected component."
        )
    dead_ends = sorted(node for node, degree in graph.out_degree() if degree == 0)
    if dead_ends != ["submission_terminal"]:
        raise DatasetValidationError(
            "Expected submission_terminal to be the only positional dead end; "
            f"found {dead_ends}."
        )
    if set(nx.descendants(graph, "standing_neutral")) & live_ids != live_ids - {
        "standing_neutral"
    }:
        raise DatasetValidationError(
            "Expected every live position to be reachable from standing_neutral."
        )


def _validate_source_summaries(dataset: SourceDataset) -> None:
    summary = dataset.grip_control_pass
    expected_summary = (17, 65, 5)
    actual_summary = (
        summary.canonical_control_count,
        summary.positional_transition_count,
        summary.control_change_template_count,
    )
    if actual_summary != expected_summary or not summary.original_backbone_preserved:
        raise DatasetValidationError(
            "Source grip/control summary does not match the approved MVP baseline."
        )
    graph_summary = dataset.validation
    if (
        graph_summary.node_count,
        graph_summary.live_node_count,
        graph_summary.terminal_node_count,
        graph_summary.edge_count,
        graph_summary.submission_edge_count,
        graph_summary.largest_scc_size,
    ) != (20, 19, 1, 65, 10, 19):
        raise DatasetValidationError(
            "Source graph validation summary does not match calculated baseline counts."
        )
    if graph_summary.validation_errors:
        raise DatasetValidationError("Source graph validation contains errors.")
    live_ids = {item.id for item in dataset.positions if not item.terminal}
    if (
        set(graph_summary.positions_supporting_10_plus_steps) != live_ids
        or graph_summary.dead_ends != ["submission_terminal"]
        or graph_summary.unreachable_from_standing
    ):
        raise DatasetValidationError(
            "Source graph reachability evidence does not match the approved baseline."
        )
    if set(dataset.mode_validation) != {"gi", "nogi"}:
        raise DatasetValidationError(
            "Source mode validation must contain exactly 'gi' and 'nogi'."
        )
    for mode_key in ("gi", "nogi"):
        mode_summary = dataset.mode_validation[mode_key]
        expected_templates = 5 if mode_key == "gi" else 4
        if (
            mode_summary.positional_transition_count != 65
            or mode_summary.control_change_template_count != expected_templates
            or mode_summary.largest_scc_size != 19
            or not mode_summary.all_live_nodes_in_one_scc
            or mode_summary.example_rolls != 5
            or mode_summary.examples_with_10_plus_positional_transitions != 5
            or mode_summary.validation_errors
        ):
            raise DatasetValidationError(
                f"Source mode validation for '{mode_key}' does not match the "
                "approved baseline."
            )


def _normalize_mode(mode: SourceMode | str) -> Mode:
    return "no_gi" if mode == "nogi" else "gi"


def _normalized_modes(modes: Iterable[SourceMode]) -> list[Mode]:
    return sorted({_normalize_mode(mode) for mode in modes})


def _bindings(items: Iterable[SourceControlBinding]) -> list[ControlBinding]:
    return sorted(
        (ControlBinding(**item.model_dump()) for item in items),
        key=lambda item: (item.control_id, item.owner, item.target),
    )


def _references(
    source_ids: str, source_reference: str, evidence_status: str
) -> RecordReferences:
    return RecordReferences(
        source_ids=sorted(item for item in source_ids.split(";") if item),
        source_references=_split_references(source_reference),
        evidence_status=evidence_status,
    )


def _split_references(source_reference: str) -> list[str]:
    return sorted(item.strip() for item in source_reference.split("|") if item.strip())
