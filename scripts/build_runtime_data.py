"""Build the human-readable runtime YAML from the normalized MVP artifact."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from simroll.datasets.importer import load_normalized_dataset


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data" / "generated" / "simroll_bjj_mvp.normalized.json"
RUNTIME_DIR = ROOT / "simroll" / "data"


def _references(record: Any) -> tuple[list[str], list[str]]:
    return record.references.source_ids, record.references.source_references


def _other_player(player: str) -> str:
    return "player_b" if player == "player_a" else "player_a"


def _resolve_player(template: str, actor_player: str) -> str:
    return actor_player if template == "actor" else _other_player(actor_player)


def _binding(binding: Any, actor_player: str) -> dict[str, str]:
    return {
        "control_id": binding.control_id,
        "owner": _resolve_player(binding.owner, actor_player),
        "target": _resolve_player(binding.target, actor_player),
    }


def build_positions(dataset: Any) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for position in dataset.positions:
        source_ids, source_references = _references(position)
        records.append(
            {
                "id": position.id,
                "name": position.display_name,
                "category": position.family,
                "player_role": position.player_a_role,
                "player_a_role": position.player_a_role,
                "player_b_role": position.player_b_role,
                "gi_allowed": position.gi_allowed,
                "no_gi_allowed": position.no_gi_allowed,
                "terminal": position.terminal,
                "tags": position.tags,
                "description": position.notes or position.control_compatibility_note,
                "allowed_controls": position.allowed_controls,
                "common_controls": position.common_controls,
                "control_compatibility_note": position.control_compatibility_note,
                "source_ids": source_ids,
                "source_references": source_references,
            }
        )
    return records


def build_controls(dataset: Any) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for control in dataset.controls:
        source_ids, source_references = _references(control)
        records.append(
            {
                "id": control.id,
                "name": control.display_name,
                "grip_type": control.category,
                "category": control.category,
                "gi_allowed": control.gi_allowed,
                "no_gi_allowed": control.no_gi_allowed,
                "gi_required": not control.no_gi_allowed,
                "control_target": control.player_relationship,
                "dominant_hand": "either",
                "tags": [control.category],
                "player_relationship": control.player_relationship,
                "owner_role_constraint": control.owner_role_constraint,
                "description": control.description,
                "confidence": control.confidence,
                "evidence_basis": control.evidence_basis,
                "source_ids": source_ids,
                "source_references": source_references,
            }
        )
    return records


def build_transitions(dataset: Any) -> list[dict[str, Any]]:
    review_ids = {
        review.transition_id
        for review in dataset.reviews.ownership_sensitive_transitions
    }
    records: list[dict[str, Any]] = []
    for transition in dataset.positional_transitions:
        source_ids, source_references = _references(transition)
        required_controls = [
            {
                "match": requirement.match,
                "control_ids": requirement.control_ids,
                "owner": _resolve_player(requirement.owner, transition.actor_player),
                "target": _resolve_player(requirement.target, transition.actor_player),
                "modes": requirement.modes,
            }
            for requirement in transition.required_controls
        ]
        created_controls = [
            _binding(binding, transition.actor_player)
            for binding in transition.controls_added
        ]
        removed_controls = [
            _binding(binding, transition.actor_player)
            for binding in transition.controls_removed
            if hasattr(binding, "control_id")
        ]
        reset_controls = any(
            hasattr(item, "scope") for item in transition.controls_removed
        )
        optional_controls = [
            _binding(binding, transition.actor_player)
            for binding in transition.optional_controls
        ]
        preserved_controls = [
            _binding(binding, transition.actor_player)
            for binding in transition.controls_preserved_if_valid
        ]
        records.append(
            {
                "id": transition.id,
                "name": transition.display_name,
                "from_position": transition.source_position,
                "to_position": transition.destination_position,
                "transition_type": transition.transition_type,
                "actor_player": transition.actor_player,
                # Compatibility projections for current frontend response consumers.
                "required_grips": sorted(
                    {
                        control_id
                        for requirement in required_controls
                        for control_id in requirement["control_ids"]
                    }
                ),
                "created_grips": sorted(
                    {binding["control_id"] for binding in created_controls}
                ),
                "removed_grips": sorted(
                    {binding["control_id"] for binding in removed_controls}
                ),
                "required_controls": required_controls,
                "created_controls": created_controls,
                "removed_controls": removed_controls,
                "optional_controls": optional_controls,
                "controls_preserved_if_valid": preserved_controls,
                "reset_controls": reset_controls,
                "gi_allowed": transition.gi_allowed,
                "no_gi_allowed": transition.no_gi_allowed,
                "difficulty": transition.confidence,
                "tags": [transition.transition_type],
                "notes": transition.notes,
                "submission": transition.submission,
                "terminal": transition.terminal,
                "ownership_review_required": transition.id in review_ids,
                "control_owner_resolution": transition.control_owner_resolution,
                "mode_classification": transition.mode_classification,
                "metadata": {
                    "actor_role": transition.actor_role,
                    "player_a_role_before": transition.player_a_role_before,
                    "player_a_role_after": transition.player_a_role_after,
                    "player_b_role_before": transition.player_b_role_before,
                    "player_b_role_after": transition.player_b_role_after,
                    "role_change": transition.role_change,
                    "role_effect": transition.role_effect,
                    "garment_grip_required": transition.garment_grip_required,
                    "mode_specific_notes": transition.mode_specific_notes,
                    "split_variant_recommendation": (
                        transition.split_variant_recommendation
                    ),
                    "source_ids": source_ids,
                    "source_references": source_references,
                    "evidence_status": transition.references.evidence_status,
                    "source_legacy_metadata": transition.source_legacy_metadata,
                },
            }
        )
    return records


def _write_yaml(path: Path, records: list[dict[str, Any]]) -> None:
    with path.open("w", encoding="utf-8", newline="\n") as output:
        yaml.safe_dump(
            records,
            output,
            allow_unicode=True,
            sort_keys=False,
            width=1000,
        )


def main() -> None:
    dataset = load_normalized_dataset(SOURCE)
    _write_yaml(RUNTIME_DIR / "positions.yaml", build_positions(dataset))
    _write_yaml(RUNTIME_DIR / "grips.yaml", build_controls(dataset))
    _write_yaml(RUNTIME_DIR / "transitions.yaml", build_transitions(dataset))


if __name__ == "__main__":
    main()
