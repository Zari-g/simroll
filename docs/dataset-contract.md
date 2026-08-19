# SimRoll BJJ MVP Dataset Contract

## Purpose and versions

Iteration 11A defines an import-layer contract for the curated dataset without
changing the engine's runtime domain. The versions have different scopes:

* Dataset version: `simroll_bjj_mvp_v1`
* Normalized contract version: `1.0.0`
* Upstream source schema: `1.1.0-grip-control-mvp`

The authoritative input is
`data/curated/simroll_bjj_mvp_v1/simroll_bjj_mvp.json`. The deterministic
output is `data/generated/simroll_bjj_mvp.normalized.json`.

## Pipeline

```text
curated source JSON
    -> strict source Pydantic models
    -> ID, relationship, metadata, count, and topology validation
    -> stable field and mode normalization
    -> strict normalized Pydantic models
    -> canonical JSON ordered by stable IDs
```

`scripts/import_bjj_mvp.py` is safe to rerun. It emits no import timestamp and
records the source SHA-256, so unchanged input produces byte-identical output.

## External-to-normalized mapping

| External source | Normalized contract | Notes |
|---|---|---|
| `schema_version`, `generated_at`, `scope` | `provenance.source_*`, `provenance.scope` | Source version/date are evidence, not engine versions. |
| `positions` | `positions` | IDs and supplied roles are unchanged. |
| `display_name`, `family` | same names | No taxonomy inference is added. |
| `gi_compatible`, `no_gi_compatible` | `gi_allowed`, `no_gi_allowed` | Naming aligns with existing SimRoll conventions. |
| `source_ids`, `source_reference` | `references.source_ids`, `references.source_references` | Delimited strings become arrays without changing values. |
| `allowed_controls`, `common_controls` | same names | They remain mode-agnostic source supersets. |
| `transitions` | `positional_transitions` | Kept separate from control-change templates. |
| `attacking_player`, `attacking_role` | `actor_player`, `actor_role` | Ownership remains a template; it is not executed in 11A. |
| `modes` | `compatible_modes` | Source `nogi` is explicitly normalized to `no_gi`. |
| `required_controls` | same name | Every clause applies; `any_of` means one listed control satisfies that clause. |
| `optional_controls` | same name | Owner/target templates are preserved. |
| `controls_added`, `controls_removed`, `controls_preserved_if_valid` | same names | Reset directives and explicit bindings stay structured. |
| `required_control_or_grip`, `resulting_control_or_grip` | `source_legacy_metadata` | Human-readable upstream fields are retained, not treated as runtime rules. |
| `control_vocabulary` | `controls` | IDs and garment/limb/body categories are unchanged. |
| `nogi_allowed` | `no_gi_allowed` | This spelling normalization is explicit. |
| `control_change_transitions` | `control_change_templates` | Five parameterized templates remain unexpanded. |
| `ownership_review` | `reviews.ownership_sensitive_transitions` | Review evidence is preserved; no ownership behavior is implemented. |
| `manual_review_transitions` | `reviews.manual_review_transitions` | Queue entries must reference an original transition. |
| split recommendations | `reviews.future_split_candidates` | Toreando and old-school sweep remain unified pending review. |
| examples and validation summaries | `example_rolls`, `validation_evidence` | Source evidence is retained alongside independently calculated checks. |

Position tags are emitted as empty arrays because the source supplies no
separate tag field. No tags, grips, role swaps, or transition effects are
invented.

## Integrity and baseline invariants

The importer rejects duplicate stable IDs, unknown position/control references,
unknown review references, invalid modes or control categories, inconsistent
mode flags, and malformed submission/terminal metadata. It also enforces the
approved baseline of 20 positions (19 live), 65 original transitions, 10
submissions, 17 controls, five templates, 30 ownership reviews, and 11 manual
reviews.

Topology is calculated in the import layer: all 19 live positions must form one
strongly connected component, all must be reachable from `standing_neutral`,
and only `submission_terminal` may be a positional dead end.

## Runtime boundary

The normalized contract is intentionally richer than the runtime `Position`,
`Transition`, and `Grip` models. Iteration 11A does not adapt it into runtime
YAML, change `GrapplingState`, execute control changes, or resolve ownership.
Those are later migration decisions.
