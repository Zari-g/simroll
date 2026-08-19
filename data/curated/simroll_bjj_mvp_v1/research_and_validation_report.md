# SimRoll BJJ MVP — Gi/No-Gi Grip and Control Pass

Generated 2026-08-18. This is an in-place enrichment of the approved backbone: **20 positions, 65 positional/submission transitions, and 10 submission edges**. No position or original transition was added, removed, renamed, or split.

## Executive decision

- Keep one shared canonical position graph for Gi and No-Gi.
- Add **17 canonical controls**: 5 garment grips, 5 limb controls, and 7 body controls.
- Keep all **65 original transitions available in both modes**. Classification: 54 A (same), 9 B (same transition, common controls differ), 0 C, 0 D, and 2 E (review before a later split).
- No original technique has a mandatory garment grip. Gi garment grips are optional controls or mode-specific alternatives, never a hidden prerequisite.
- Add only **5 parameterized control-change templates**, reported separately from the positional graph.
- Use conservative retention: position-changing transitions discard every control except explicitly preserved controls that remain valid at the destination.

## 1. Research notes

### Directly sourced facts

1. GrappleMap is a directed pose/transition graph, its repository states that its code and data are public domain, and its README explicitly says Gi-specific techniques and clothing are not modeled. It also cautions that detailed hand fighting is barely modeled. This makes it useful for No-Gi topology, not for Gi grip legality or direct import.
2. The IBJJF uniform page distinguishes a woven, grippable Gi (collar, sleeves, pants and belt) from No-Gi rash guards and pocketless shorts/spats. SimRoll therefore treats garment grips as Gi-only and rejects them in No-Gi.
3. IBJJF's official event reporting describes double-sleeve control and collar-and-elbow grips in Gi competition, supporting sleeve and collar as canonical garment-grip concepts.
4. Gracie University's public material uses underhook and double-underhook terminology and describes a bottom half-guard underhook as materially changing sweep/pass availability.
5. IBJJF's submission overview describes the kimura grip as a reusable control, supporting a broad arm-isolation state rather than a technique-specific hand-placement taxonomy.

### Common BJJ conventions used

- Wrist, ankle, leg, two-on-one, underhook, overhook, crossface, body lock, seatbelt, head control and head-and-arm control can exist without a Gi.
- Collar, sleeve, lapel, belt and pants grips depend on a Gi garment.
- A control is only a hard prerequisite where the named technique fundamentally depends on that connection. Common but substitutable hand placements remain optional.

### SimRoll normalization decisions

- Collapse grip orientations, sides, depths, clasp shapes, cuff variants and named guard systems.
- Represent arm-lock availability with broad `arm_isolation`, not separate kimura/Americana/armbar grip nodes.
- Model mode-dependent prerequisites as structured `any_of` clauses. All clauses apply; one valid control satisfies each clause.
- Treat `allowed_controls` on positions as a superset. Mode flags and owner-role constraints live on the control record.
- Use five parameterized control-change transitions instead of dozens of technique-like self-loops.

### Inferred recommendations

- Two transitions are marked class E, not split: Toreando and old-school sweep. A qualified practitioner should decide whether Gi pants-grip and No-Gi limb-control versions need separate analytics or probabilities.
- The vocabulary is intentionally not an IBJJF foul engine. Detailed inside-sleeve/inside-pants grip legality, finger placement, age/belt restrictions and uniform inspection belong in a later competition rules module.

## 2. Canonical control vocabulary

The integration-ready vocabulary is in `controls.csv` and `control_vocabulary` in the JSON. Category totals: garment 5, limb 5, body 7.

No-Gi invariant: if `nogi_allowed=false`, the control cannot be created, preserved, restored, or committed.

## 3. Enriched 65-transition dataset

Every original transition now has: `modes`, `mode_classification`, structured `required_controls`, `optional_controls`, `controls_added`, `controls_removed`, `controls_preserved_if_valid`, `garment_grip_required`, role-before/after fields, ownership resolution, mode notes, sources and confidence.

Classification meanings:

- **A:** essentially the same in Gi and No-Gi.
- **B:** available in both; common controls differ.
- **C:** Gi-only. None in the current 65.
- **D:** No-Gi-only. None in the current 65.
- **E:** both modes now; consider a future mode-specific split. Two rows.

## 4. Control-change transitions

The five templates are `establish_limb_control`, `establish_body_control`, `establish_garment_grip` (Gi only), `release_control`, and `switch_control`. They remain self-loops on the current position and never count toward positional graph depth.

## 5. Destination control validity

Runtime order:

1. Resolve `actor` and `opponent` templates to concrete player IDs.
2. Execute the transition and assign destination roles.
3. Apply explicit removals.
4. Apply explicit additions.
5. Preserve only explicitly listed controls.
6. Drop controls not in destination `allowed_controls` or invalid for the control's `owner_role_constraint`.
7. Apply mode validation; reject any No-Gi garment control before commit.

Recommendation: keep `allowed_controls` and `common_controls` on each position. Keep Gi/No-Gi flags and owner-role constraints on the vocabulary records. This is smaller and clearer than a separate compatibility matrix.

## 6. Player ownership and role changes

Minimum runtime control instance:

`{ control_id, owner_player, target_player, side? }`

`owner_player` and `target_player` are stable IDs such as Player A and Player B. They never become “top” or “bottom.” Transition templates use `actor`/`opponent`, resolved before the move. The destination position then determines each player's new role. This prevents a swept player's underhook or wrist control from silently changing owners.

The ownership review covers 30 sweeps, reversals, escapes, technical escapes, takedowns and back takes. It records both players' roles before and after every such edge.

## 7. Gi/No-Gi validation

| Check | Gi | No-Gi |
|---|---:|---:|
| Positional transitions | 65 | 65 |
| Control-change templates | 5 | 4 |
| Live positional dead ends | 0 | 0 |
| Live states with no immediately usable zero-control edge | 0 | 0 |
| Largest live SCC | 19 | 19 |
| No-Gi garment-control errors | n/a | 0 |
| Example rolls with 10+ positional transitions | 5 | 5 |
| Validation errors | 0 | 0 |

Both mode-filtered positional graphs retain all 19 live states in one strongly connected component. Grip-switch self-loops are excluded from this analysis.

## 8–9. Example Gi and No-Gi rolls

The package includes five Gi and five No-Gi examples. Each has at least 10 positional transitions, with control changes separately marked. Every step records position before, controls before, action, player, destination, and controls after. Gi examples intentionally show garment grips; No-Gi examples contain none.

| Sequence | Mode | Positional | Control changes | Total steps | Final |
|---|---:|---:|---:|---:|---|
| gi_roll_01 | gi | 12 | 6 | 18 | submission_terminal |
| gi_roll_02 | gi | 12 | 5 | 17 | half_guard_bottom |
| gi_roll_03 | gi | 13 | 8 | 21 | closed_guard_top |
| gi_roll_04 | gi | 13 | 4 | 17 | submission_terminal |
| gi_roll_05 | gi | 12 | 3 | 15 | knee_on_belly_bottom |
| nogi_roll_01 | nogi | 11 | 3 | 14 | side_control_top |
| nogi_roll_02 | nogi | 14 | 3 | 17 | turtle_top |
| nogi_roll_03 | nogi | 13 | 4 | 17 | closed_guard_bottom |
| nogi_roll_04 | nogi | 12 | 3 | 15 | submission_terminal |
| nogi_roll_05 | nogi | 15 | 5 | 20 | back_control_bottom |

## 10. Human/manual BJJ review list

- **standing_guard_pull_to_closed_guard_bottom** (B): Are the optional Gi and No-Gi control alternatives broad enough without becoming mandatory?
- **standing_guard_pull_conceded_to_closed_guard_top** (B): Are the optional Gi and No-Gi control alternatives broad enough without becoming mandatory?
- **closed_guard_bottom_arm_drag_to_back_control_top** (B): Are the optional Gi and No-Gi control alternatives broad enough without becoming mandatory?
- **closed_guard_bottom_opponent_stand_open_to_open_guard_bottom** (B): Are the optional Gi and No-Gi control alternatives broad enough without becoming mandatory?
- **closed_guard_top_stand_open_to_open_guard_top** (B): Are the optional Gi and No-Gi control alternatives broad enough without becoming mandatory?
- **closed_guard_top_opponent_arm_drag_to_back_control_bottom** (B): Are the optional Gi and No-Gi control alternatives broad enough without becoming mandatory?
- **open_guard_bottom_tripod_sweep_to_open_guard_top** (B): Are the optional Gi and No-Gi control alternatives broad enough without becoming mandatory?
- **open_guard_top_toreando_to_side_control_top** (E): Does mode-specific gripping materially change prerequisites enough to justify two technique records?
- **open_guard_top_opponent_tripod_sweep** (B): Are the optional Gi and No-Gi control alternatives broad enough without becoming mandatory?
- **half_guard_bottom_old_school_sweep_to_side_control_top** (E): Does mode-specific gripping materially change prerequisites enough to justify two technique records?
- **turtle_top_spiral_ride_to_side_control** (B): Are the optional Gi and No-Gi control alternatives broad enough without becoming mandatory?

These rows are not invalid. They are the highest-value practitioner review targets because common grips differ by mode or a later split may improve fidelity.

## Deferred to later versions

- Detailed grip orientation, side, depth, clasp and finger-placement legality.
- Named Gi guard systems and lapel entanglements.
- Competition-rules profiles by organization, belt, age and year.
- Probabilities conditioned on grip quality, posture, fatigue or skill.
- Body triangles, hooks, leg-entanglement taxonomies and specialist submissions.
- Separate Gi/No-Gi variants only after manual review shows different prerequisites or probability models are needed.

## Sources

- [Eelis/GrappleMap repository and README](https://github.com/Eelis/GrappleMap) — No-Gi positional/transition cross-check and broad control tags only
- [IBJJF Rules Books and Videos](https://ibjjf.com/books-videos) — Authoritative link to Rule Book v6.0 and illegal-moves material
- [IBJJF Uniform Requirements](https://ibjjf.com/uniform) — Gi versus No-Gi garment model
- [IBJJF Absolute GP recap](https://ibjjf.com/news/ibjjf-absolute-gp-recap-kaynan-wins-gp-as-atos-goes-unde) — Sanity-check common Gi sleeve and collar/elbow controls in live competition
- [IBJJF: The Most Effective Submissions in Jiu-Jitsu](https://ibjjf.com/news/the-most-effective-submissions-in-jiu-jitsu) — Arm isolation and submission-control cross-check
- [Gracie University public foundations curriculum](https://www.gracieuniversity.com/Pages/Public/Course.aspx?se=293) — Fundamental escapes, guard work, controls, back takes and submissions
- [Gracie University: Double Underhook Pass](https://www.gracieuniversity.com/Pages/Public/Lesson.aspx?se=293&sh=2088) — Underhook vocabulary
- [Gracie University: Half-guard passing lesson index](https://www.gracieuniversity.com/__FriendlyUrls_SwitchView?ReturnUrl=%2FPages%2FPublic%2Flesson%3Fenc%3D8ytnsPgRRcZ%252F8EPpLmCg0bwPL4EmLEAnhDVLS41Ffdo%253D) — Half-guard underhook semantics
