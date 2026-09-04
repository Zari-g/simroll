# SimRoll — Roadmap

## Philosophy

SimRoll will be developed using an iterative Agile-style approach.

The project will evolve gradually through small working versions instead of one large final release.

Each iteration should improve the system while keeping the architecture modular and expandable.

---

# Iteration 1 — Core Data Models

Goal:
Define the foundational grappling entities.

Features:
- Position model
- Transition model
- Grip model
- Tags and categories
- Basic validation structure

Status:
Complete

---

# Iteration 2 — Graph Engine

Goal:
Represent BJJ as a graph system.

Features:
- Directed graph structure
- Transition lookup
- Position connectivity
- Relationship validation

Status:
Complete

---

# Iteration 3 — Gi & No-Gi Logic

Goal:
Introduce grappling constraints.

Features:
- Gi/no-gi filtering
- Grip requirements
- Grip creation/removal
- Transition constraints

Status:
Complete

---

# Iteration 4 — Pathfinding

Goal:
Allow users to explore pathways between positions.

Features:
- Shortest path lookup
- Multiple pathway discovery
- Filtering by difficulty
- Filtering by transition type

Status:
Complete

---

# Iteration 5 — API Layer

Goal:
Expose the grappling engine through an API.

Features:
- FastAPI setup - Complete
- Position endpoints - Complete
- Transition endpoints - Complete
- Pathfinding endpoints - Complete

Status:
Complete

---

# Iteration 6 — Basic Web Interface

Goal:
Create the first interactive frontend.

Features:
- Frontend foundation - Complete
- Position explorer - Complete
- Transition viewer - Complete
- Grip-aware state controls - Complete
- Search functionality - Complete
- Basic graph visualization - Complete
- Pathfinding interface - Complete

Status:
Complete

---

# Iteration 7 — Roll Simulation

Goal:
Create a more dynamic user experience.

Features:
- Backend roll simulation engine - Complete (Iteration 7A)
- Single-step roll API - Complete (Iteration 7B)
- Multi-step simulation API - Complete (Iteration 7C)
- Interactive Roll Simulator - Complete (Iteration 7D)
- User-controlled branching - Complete (Iteration 7D)
- Randomized single-step transitions - Complete (Iteration 7D)
- Roll History and authoritative state history - Complete (Iteration 7E)
- Auto Roll and continued manual branching - Complete (Iteration 7E)

Status:
Complete

Milestones:
- 7A Roll Simulation Engine - Complete
- 7B Single-Step API - Complete
- 7C Multi-Step API - Complete
- 7D Interactive Roll Simulator - Complete
- 7E Roll History & Auto Roll - Complete

---

# Iteration 8 — Visual Interface Redesign

Goal:
Turn the existing web experience into a polished, interactive visual BJJ simulator.

Milestones:
- 8A Visual Design System & Application Shell - Complete
- 8B Roll Simulator Layout - Complete
- 8C Grappling Stage / Static Grappler Foundation - Complete
- 8D Grip Visual Modifier System - Complete
- 8E Transition Movement & Pose Interpolation - Complete
- 8F Animation Playback & Roll Timeline Integration - Complete

Status:
Complete

---

# Iteration 9 — Grappler Graphics System

Goal:
Develop the reusable 2D grappler graphics system by separating pose geometry,
anatomy proportions, and rendering concerns.

Milestones:
- 9A Grappler Anatomy Model - Complete
- 9B Layered Body Renderer - Complete
- 9C Gi / No-Gi Grappler Appearance - Complete
- 9D Core Position Visual Library - Complete
- 9E Contact & Occlusion System - Complete
- 9F Grappler Graphics Integration & Polish - Complete

Architecture:
- Pose geometry determines where each body segment is placed.
- Shared anatomy presets determine body proportions and rendering metadata.
- Pure body-geometry helpers combine pose length with anatomy width and taper.
- Mode-aware appearance presets select Gi or No-Gi apparel and player themes
  independently of pose and anatomy.
- The core position library covers every current repository position and uses
  immutable pose variants to share family geometry where useful.
- The layered SVG rig renders torso, limbs, hands, feet, and head without
  changing authoritative grappling state or player ordering; apparel overlays
  reuse the same pose-driven segment transforms.
- Typed position contacts, pose-derived grip anchors, and small explicit
  body-part occlusion overrides make overlaps read as intentional control while
  keeping anatomy layering as the default.
- One display-state boundary selects configured, live, historical, or animated
  state so position, mode, grips, apparel, contacts, and occlusion stay aligned.
- Live steps, Auto Roll paths, and historical replay share the same lightweight
  pose interpolation and reusable SVG scene. Advanced transition choreography
  remains intentionally deferred to Iteration 10.

Status:
Complete

---

# Iteration 10 — Transition Animation & Roll Playback

Goal:
Build reusable movement primitives and animated roll simulation playback.

## 10A — Hierarchical Kinematic Grappler Skeleton

- [x] Define a typed pelvis-rooted hierarchy for the core, head, arms, and
  legs, with immutable parent-relative joint transforms.
- [x] Resolve local transforms into world joints and derive renderer segments,
  rotations, and lengths with pure helpers.
- [x] Add a compatibility adapter from legacy flat poses and migrate one
  representative Closed Guard pose without re-authoring the Iteration 9
  position library.
- [x] Preserve the existing SVG, anatomy, apparel, contact, grip, occlusion,
  playback, and exact transition-endpoint contracts.
- [x] Cover hierarchy, connected segments, parent movement, deterministic
  conversion, endpoint compatibility, and immutability with frontend tests.

10A Status:
Complete

## 10B — Articulated Pelvis, Spine & Chest

- [x] Add anatomy-backed pelvis-to-spine and spine-to-chest lengths plus
  shoulder, hip, neck, and head attachment proportions.
- [x] Add compact typed pose controls for pelvis rotation, spine flexion,
  chest rotation, neck/head rotation, and connected limb articulation.
- [x] Derive shoulder anchors from the chest and hip anchors from the pelvis so
  trunk motion carries every dependent chain coherently.
- [x] Derive a renderer-compatible torso chord and richer resolved core data
  from the pelvis, spine, chest, neck, and head hierarchy outside React.
- [x] Migrate Closed Guard, Mount, and Side Control top/bottom figures to the
  articulated authoring path while preserving legacy pose adapters.
- [x] Cover core dependencies, flexion, symmetry, continuity, determinism,
  immutability, migration, compatibility, and animation endpoints with tests.

10B Status:
Complete

## 10C â€” Joint Constraints & Pose Validation

- [x] Add a typed reusable human constraint profile for the articulated core,
  shoulders, elbows, wrists, hips, knees, and ankles.
- [x] Validate authored local transforms and structural integrity independently
  from deterministic angle normalization and correction.
- [x] Apply safe local rotations before forward kinematics while preserving
  the renderer, contacts, grips, playback, and exact valid endpoints.
- [x] Add development-only authoring diagnostics and focused coverage for
  limits, reporting, immutability, continuity, and all six migrated figures.

10C Status:
Complete

## 10D — Core Pose Realism

- [x] Re-author Closed Guard, Mount, and Side Control top/bottom figures with
  clearer pelvis, chest, head, limb, and opponent relationships.
- [x] Carry resolved pelvis-spine-chest points through the renderer pose and
  derive a curved anatomy-backed SVG torso silhouette from them.
- [x] Reuse torso landmarks for Gi and No-Gi apparel while preserving legacy
  torso chords, contacts, grips, transitions, and targeted occlusion rules.
- [x] Keep all six authored skeletons inside the default human constraint
  profile and add focused torso/core geometry coverage.
- [x] Inspect all three scenes at normal Roll Simulator scale in the running
  application.

10D Status:
Complete

## 10E — Motion Primitives & Authored Choreography

- [x] Add reusable immutable grappling motion primitives at the local skeleton
  boundary.
- [x] Author transition-specific phases for all four transitions in the current
  graph while preserving exact endpoints and the safe unsupported fallback.
- [x] Keep generated phases inside the existing joint constraint profile.

10E Status:
Complete

## 10F — Contact-Aware Motion & Animation Polish

- [x] Reuse position and grip contacts for deterministic, bounded correction of
  the highest-value anchors after keyframe constraints.
- [x] Add per-grappler timing offsets for hips, torso, arms, and head plus
  restrained anticipation, weight shift, follow-through, and settling.
- [x] Improve the full current transition set across guard reversals, mount
  escape, and the mount-to-side-control pass without changing playback.
- [x] Verify manual stepping, Auto Roll, and history replay visually with stable
  contacts and no observed snapping or jitter.

10F Status:
Complete

Iteration 10 Status:
Complete

---

# Iteration 11 — Curated Dataset Integration

Goal:
Safely integrate the curated 20-position BJJ MVP through explicit contracts
before changing runtime grappling behavior.

## 11A — Dataset Contract & Import Pipeline

- [x] Stage the authoritative curated JSON and provenance report separately
  from runtime YAML.
- [x] Add a strict versioned import-layer Pydantic contract.
- [x] Generate one deterministic canonical normalized JSON artifact.
- [x] Validate IDs, references, review queues, exact baseline counts, and graph
  topology.
- [x] Preserve the current three-position starter runtime graph.

11A Status:
Complete

## 11B — Player-Owned Control Architecture

- [x] Add stable `player_a` / `player_b` identifiers and immutable owned-control
  instances.
- [x] Migrate complete runtime states and API payloads from flat grip IDs to
  player-owned controls.
- [x] Preserve the three-position, four-transition starter runtime through a
  narrow ownership compatibility adapter.
- [x] Keep player identity stable while deriving top/bottom roles from the
  current position.
- [x] Preserve hashable pathfinding and simulator state behavior plus Gi/No-Gi
  validation.

11B Status:
Complete

## 11C — Expanded Runtime Graph

- [x] Derive the human-readable runtime YAML from the canonical normalized
  artifact while preserving reviewed IDs.
- [x] Activate 20 positions, 65 positional/submission transitions, and 17
  controls without loading the five control-change templates.
- [x] Resolve deterministic actor/opponent requirements to player-owned
  controls and preserve unresolved lifecycle/review metadata.
- [x] Load `submission_terminal` and all 10 submission transitions without
  adding a new simulator stop reason.
- [x] Validate runtime references, modes, ownership mappings, terminal edges,
  counts, live-node reachability, and SCC invariants.

11C Status:
Complete

## 11D â€” Control Lifecycle & State Validity

- [x] Execute reset, exact removal/addition, and conservative explicit
  preservation for positional transitions.
- [x] Validate controls against destination allowlists, stable owner roles, and
  Gi/No-Gi mode compatibility.
- [x] Keep optional controls non-blocking and leave control-change templates
  unexpanded.
- [x] Preserve immutable complete-state simulator and pathfinder behavior.

11D Status:
Complete

## 11E — Control-Change Actions

- [x] Load the five normalized parameterized templates without pre-expansion.
- [x] Generate and execute legal same-position acquisition, release, and
  switch actions while preserving mode, position, and player identity.
- [x] Let bounded simulation mix positional transitions and control actions
  with explicit positional/control/total event accounting.
- [x] Expose typed actions to roll API and history consumers without adding
  control animations.
- [x] Keep pathfinding positional-only.

11E Status:
Complete

## 11F — Long-Roll & Submission Simulation

- [x] Stop immediately after an executed submission transition and expose the
  typed `submission` reason with explicit precedence over the event limit.
- [x] Keep a direct `submission_terminal` start safe without fabricating a
  submission event.
- [x] Execute all five Gi and five No-Gi normalized example rolls as exact
  integration fixtures with position, mode, control, and player checks.
- [x] Validate deterministic seeded simulations and 10+ positional-step
  capability in both modes without requiring every random roll to be long.
- [x] Keep positional, control, and total-event counters distinct across the
  domain, API, and frontend while retaining compatibility aliases.
- [x] Render submission endings with the executed transition display name and
  preserve history/playback behavior.

11F Status:
Complete

## 11G — Frontend Dataset Integration

- [x] Consume all 20 runtime positions, 65 positional/submission transitions,
  and 17 controls across the existing frontend data flow.
- [x] Preserve player ownership and targets in readable control state,
  Pathfinder results, transition details, and roll history.
- [x] Distinguish positional, control-change, and terminal submission events in
  history while preserving mixed-event playback and authoritative endpoints.
- [x] Keep Gi/No-Gi on one backend-owned graph and remove garment controls when
  frontend mode configuration changes to No-Gi.
- [x] Preserve the three articulated position visuals and registered
  choreography; use intentional position and no-choreography fallbacks for the
  remaining dataset instead of fabricated BJJ visuals.
- [x] Expose all graph edges, incoming/outgoing position moves, readable route
  metadata, and a distinct submission terminal in Explorer and Pathfinder.

11G Status:
Complete

## 11H — Integration Polish & Iteration Closeout

- [x] Consolidate exact runtime count, reference, SCC, terminal, mode, ownership,
  lifecycle, and generated-state invariants.
- [x] Replay representative curated Gi and No-Gi rolls through legal actions,
  API steps, serialization, and frontend-compatible mixed-event history.
- [x] Add a non-mutating deterministic runtime YAML freshness check.
- [x] Audit flat grip-ID/starter frontend adapters and retain only the narrow
  setup conversions and documented API aliases still used by consumers.
- [x] Verify expanded frontend flows, submission endings, mode switching, and
  intentional position/choreography fallbacks.
- [x] Preserve 30 ownership-sensitive records, 11 manual-review transitions,
  and the Toreando/old-school sweep future split candidates.

11H Status:
Complete

Iteration 11 Status:
Complete

---

# Iteration 12 — Data-Driven Grappling Animation

## 12A — Animation Recipe Schema & Registry

- [x] Separate optional visual recipes from authoritative semantic transitions.
- [x] Add immutable typed recipe phases, timing, per-player primitive
  choreography, low-level overrides, metadata, and future contact requirements.
- [x] Validate authored recipe IDs, durations, ordered progress, base progress,
  timing, primitive payloads, overrides, and reserved contact metadata.
- [x] Make a centralized read-only registry the animation authoring boundary.
- [x] Migrate hip bump sweep, flower sweep, elbow escape, and
  mount-to-side-control choreography without changing their authored phases.
- [x] Preserve exact endpoints, constraints, contact correction, determinism,
  and a safe eased interpolation fallback for transitions without recipes.

12A Status:
Complete

Deferred from 12A to later Iteration 12 work: expanded primitives, active
contact/control targets, technique-family templates, procedural recipe
compilation, and graph coverage tooling. Expanded primitives are completed in
12B below.

---

## 12B — Expanded BJJ Motion Primitive Library

- [x] Expand the immutable skeleton-space vocabulary across core/base, arm,
  leg, and relative/force-like movement categories.
- [x] Parameterize side, amount, path, direction, angle, and distance while
  retaining compatibility with all existing recipe primitives.
- [x] Validate every new primitive payload and reject non-finite values,
  invalid sides, missing requirements, and unsupported enum values.
- [x] Prove reusable composition with sweep-like, guard-pass-like, escape-like,
  and positional-advance recipe keyframes.
- [x] Preserve determinism, immutability, constraints, contact correction, and
  the existing renderer pipeline.

12B Status:
Complete

Semantic grip/contact target compilation is completed in 12C below. Technique
families and broader graph choreography remain deferred to later Iteration 12.

---

## 12C â€” Semantic Contact & Control Targets

- [x] Add an immutable, typed semantic landmark and control-target registry.
- [x] Compile representative hand, arm/torso, and leg relationships into the
  existing weighted contact-correction contract.
- [x] Keep Gi and No-Gi on shared canonical position visuals while active
  garment, limb, and body controls provide their visual differences.
- [x] Let recipes visually preserve, release, and acquire controls with
  deterministic source/destination influence blending.
- [x] Preserve backend authority, exact endpoints, finite skeleton output,
  local joint constraints, and separate decorative grip rendering.

12C Status:
Complete

Technique-family templates, generalized inverse kinematics, collision/force
physics, grip breaking, and broader graph animation coverage remain deferred
to 12D or later work.

---

## 12D — Technique Family Templates

- [x] Add typed declarative family parameters, phases, timing, and visual
  control lifecycle defaults.
- [x] Validate and deeply freeze a centralized family registry.
- [x] Compile family-backed authoring into ordinary validated animation
  recipes without changing the executor.
- [x] Migrate rotation sweep, hip escape, and step-over advance choreography
  while retaining Flower Sweep as an explicit recipe.
- [x] Prove side parameterization and reuse of one hip-escape family by two
  distinct semantic transitions.

12D Status:
Complete

Full graph coverage, additional technique families, generalized IK,
collision/force physics, grip-breaking mechanics, and realism redesign remain
deferred.

---

## 12E — Procedural Recipe Compiler & Coverage Resolution

- [x] Resolve every visual transition through explicit recipe, family
  compilation, then deterministic fallback precedence.
- [x] Return one immutable recipe/duration result to the existing
  family-agnostic execution pipeline.
- [x] Centralize `explicit` / `family` / `fallback` coverage classification on
  the same resolver used by playback.
- [x] Preserve exact endpoints, finite fallback output, constraints, controls,
  and backend authority over semantic legality.

12E Status:
Complete

Graph-wide coverage authoring/reporting remains deferred to 12F. Additional
families, generalized IK, collision/force physics, grip breaking, and broad
realism work also remain deferred.

---

## 12F — Graph Animation Coverage & Authoring Workflow

- [x] Derive graph-wide `explicit` / `family` / `fallback` coverage from the
  authoritative 65-transition dataset through the playback resolver.
- [x] Generate and freshness-check a reviewable Markdown coverage artifact.
- [x] Reject orphaned transition IDs, duplicate animation ownership, invalid
  family references, and definitions that cannot compile.
- [x] Add reusable pressure-pass, guard-recovery, spin-behind advance, and
  rotational back-take families and upgrade representative transitions.
- [x] Preserve deterministic fallback as valid coverage for unresolved moves.

12F Status:
Complete

Generalized IK, collision/force physics, grip-breaking mechanics, bespoke
coverage for every transition, and broad animation realism remain deferred.

---

# Iteration 13 — Ground-Relative Pose Anchoring

## 13A — Grounded Anchor Primitive

- [x] Add a mat-relative vertical anchor declaration for one or more joints
  of a single authored pose, kept independent from existing pose, grip, and
  recipe data.
- [x] Add a pure deterministic helper that grounds declared joints by
  translating the skeleton in root space, never touching local rotations or
  bone lengths.
- [x] Keep grounding inside the existing joint constraint profile and
  resolve multiple declared anchors deterministically in canonical joint
  order rather than attempting simultaneous multi-anchor solving.
- [x] Cover no-op backward compatibility, finite output, determinism,
  immutability, and constraint compliance with focused tests.
- [x] Leave every authored pose's visual output pixel-exact; grounding is
  opt-in and not yet wired into any position visual or recipe.

13A Status:
Complete

## 13B — Position Visual Coverage Expansion

- [x] Author real articulated top/bottom poses for Open Guard, Half Guard,
  and Back Control using the existing `ArticulatedGrapplerPoseDefinition`
  pattern, bringing real artwork from 3 to 6 of the 19 live positions.
- [x] Wire the 13A grounded-anchor primitive into authored position visuals
  for the first time, pinning each pose's clearest weight-bearing joint
  (a passer's base knee, a hooking foot) to a fixed mat baseline.
- [x] Add position contacts and occlusion overrides for all 3 new positions
  following the existing core-position pattern, keeping every contact
  anchored within a tight tolerance of its displayed target body.
- [x] Extend `corePositionVisualIds` and its coverage-tracking tests to the
  3 new positions without touching the semantic graph or adding Gi/No-Gi
  duplicate position nodes.
- [x] Inspect all 6 core scenes (3 prior, 3 new) at normal Roll Simulator
  scale in the running application.

13B Status:
Complete

## 13C — Relational Contact Correction

- [x] Add a small named set of two-anchor relational adjustments
  (`hand-to-grip-target`, `knee-to-hip-line`, `foot-to-inner-thigh`) that a
  declared contact can explicitly opt into, kept separate from the default
  whole-root correction.
- [x] Rotate only the single joint that geometrically controls the
  declared anchor (elbow for a hand, hip for a knee, knee for a foot)
  toward the contact's target, with a bounded and deterministic angle
  correction reusing the existing `maxCorrection`-style clamping pattern.
- [x] Re-clamp every relational adjustment through the existing joint
  constraint profile via `constrainSkeletonPose` and skip a target
  entirely when its declared body part does not match the opted-in
  anchor pair, rather than guessing.
- [x] Preserve the existing whole-root correction exactly for every
  contact that does not opt in; this is additive, not a replacement.
- [x] Cover bounded correction, determinism, immutability, finite output,
  joint constraint compliance, the anchor-pair opt-out safety case, and a
  connected-limb (not just torso) tracking case with focused tests.

13C Status:
Complete

## 13D — Transition Choreography for Open Guard, Half Guard & Back Control

- [x] Wire the highest-value fallback transitions touching Open Guard, Half
  Guard, or Back Control onto existing technique families (`sweep.rotation`,
  `escape.hip`, `pass.pressure`, `backTake.rotation`, `guard.recovery`)
  wherever the technique genuinely matched, without inventing a new family.
- [x] Move animation coverage from 65 total / 1 explicit / 14 family / 50
  fallback to 65 total / 1 explicit / 27 family / 37 fallback.
- [x] Regenerate `docs/animation-coverage.md` via
  `npm.cmd run animation:coverage` rather than hand-editing it.

Transitions moved from fallback to family-backed:
- `open_guard_bottom_tripod_sweep_to_open_guard_top` — `sweep.rotation`
- `open_guard_top_opponent_tripod_sweep` — `sweep.rotation`
- `half_guard_bottom_old_school_sweep_to_side_control_top` — `sweep.rotation`
- `half_guard_bottom_underhook_knee_tap_sweep` — `sweep.rotation`
- `half_guard_top_opponent_underhook_sweep` — `sweep.rotation`
- `mount_top_opponent_elbow_knee_to_half_guard_top` — `escape.hip`
- `knee_on_belly_top_opponent_shrimp_to_half_guard_top` — `escape.hip`
- `back_control_bottom_turn_in_to_half_guard_top` — `escape.hip`
- `back_control_top_opponent_turn_in_to_half_guard_bottom` — `escape.hip`
- `open_guard_top_force_half_guard` — `pass.pressure`
- `mount_bottom_opponent_gift_wrap_to_back_control_bottom` — `backTake.rotation`
- `closed_guard_top_opponent_arm_drag_to_back_control_bottom` — `backTake.rotation`
- `half_guard_top_opponent_recovers_closed_guard` — `guard.recovery`

13D Status:
Complete

Remaining fallback transitions touching these 3 positions (e.g. back control's
`scrape_off`/`opponent_transitions_to_mount` and the toreando/submission
edges) did not genuinely match an existing family and remain deferred rather
than force-fit.

## 13E — Verification & Iteration Closeout

- [x] Re-run the complete frontend suite (tests, lint, build, animation
  coverage generation and check) and confirm the numbers reported by 13D
  still hold with nothing hand-edited.
- [x] Confirm no backend (`simroll/`, `tests/`) files changed anywhere across
  13A-13D, then run `pytest` and `scripts/build_runtime_data.py --check`
  as a defense-in-depth confirmation.
- [x] Run `git diff --check` across the full 13A-13D range.
- [x] Start the backend and frontend locally and visually inspect, at normal
  Roll Simulator scale: all 6 canonical position visuals (the 3 from before
  13B plus Open Guard, Half Guard, and Back Control from 13B) in the live
  Roll Simulator, the intentional "coming soon" placeholder on each
  position pair's non-canonical side, and 2 of the 13D family-backed
  transitions (`half_guard_bottom_old_school_sweep_to_side_control_top` and
  `back_control_top_opponent_turn_in_to_half_guard_bottom`) playing a
  smooth multi-frame animation into their correct destination pose.
- [x] Confirm no regression in the original 3 core positions or their
  existing transitions.

13E Status:
Complete

Iteration 13 Status:
Complete

Intentionally deferred out of Iteration 13: 13 of the 19 live positions
(every non-canonical position ID, e.g. `open_guard_top`, `half_guard_top`,
`back_control_bottom`) still render the intentional "coming soon" placeholder
rather than authored artwork; 37 of 65 transitions still resolve through the
safe generic fallback animation rather than an explicit or family-backed
recipe; and generalized inverse kinematics, multi-joint/chain relational
solving, and mat/ground contact modeling beyond the single grounded anchor
per pose all remain deferred to later work.

---

# Iteration 14 — Limb-Aware Relational Animation

## 14A — Persistent Relational Controls

- [x] Extend reusable control-contact targets with optional
  `relationalAnchor` metadata and carry it through production target
  compilation into `correctSkeletonContacts()` without transition-ID or
  control-ID branches in the animation executor or solver.
- [x] Wire the landmark-safe controls supported by the Iteration 13C
  single-joint rules:
  - `wrist_control`, `sleeve_grip`, `collar_grip`, and `ankle_control` use
    `hand-to-grip-target`.
  - `butterfly_hook` uses `foot-to-inner-thigh`.
- [x] Keep `underhook`, `overhook`, `seatbelt`, and
  `closed_guard_connection` on their existing non-relational fallback.
  Their current semantic contacts originate at forearm/upper-arm or shin
  landmarks, which do not safely match the hand, knee, or foot anchor pairs
  available in 13C. They are intentionally not force-fit.
- [x] Reuse the existing recipe lifecycle: preserved source controls remain
  active through intermediate phases, released controls fade until
  `activeUntil`, and acquired controls begin at `activeFrom`. The resulting
  phase strength gates the same compiled relational target; no second
  lifecycle was introduced.
- [x] Preserve the shared Gi/No-Gi position graph and backend authority.
  Sleeve and collar controls remain garment controls and are removed from
  No-Gi active controls by the existing mode-validation/filtering path;
  wrist, ankle, and butterfly controls remain mode-compatible.
- [x] Preserve safe fallback behavior for unknown controls, missing visual
  definitions, unsupported landmarks, zero-strength targets, and contacts
  without relational metadata.
- [x] Cover registry mapping, unsupported fallback, multi-phase persistence,
  release/acquire timing, deterministic immutable finite output, constraint
  validity, and limb-only correction with an unchanged grappler root.

14A Status:
Complete

Deferred to 14B: reusable two-bone arm/leg IK for the already compatible hand
and foot relational targets. Broader forearm/upper-arm wraps and shin-based
closed-guard connections remain outside 14B. Iteration 14 as a whole is not
complete.

## 14B — Two-Bone IK Solver

- [x] Add a reusable O(1) analytic solver for `leftArm`, `rightArm`,
  `leftLeg`, and `rightLeg`, expressed entirely through the existing local
  shoulder/elbow and hip/knee transforms.
- [x] Preserve the authored root and segment offsets exactly. Reachable
  targets solve to the requested end-joint point; targets outside the
  triangle's maximum or minimum radius clamp to the closest geometric reach.
- [x] Make both bend branches explicit and deterministic. Production
  correction retains the limb's authored bend side, using each chain's fixed
  semantic preference when the middle joint is straight, so elbows and knees
  do not choose a branch randomly between frames.
- [x] Return typed failures for invalid targets, malformed chains, structural
  pose errors, zero-length segments, and coincident root/target geometry
  instead of throwing from the animation path.
- [x] Reuse `constrainSkeletonPose()` after the analytic solve rather than
  introducing a second joint-limit profile.
- [x] Route `hand-to-grip-target` through arm IK and
  `foot-to-inner-thigh` through leg IK. Keep the bounded Iteration 13C
  single-joint adjustment as the fallback whenever IK cannot solve safely;
  `knee-to-hip-line` remains on its existing single-hip correction.
- [x] Preserve exact authoritative animation endpoints, upstream Gi/No-Gi
  legality, and the existing control preserve/release/acquire lifecycle.
- [x] Cover arm and leg placement, exact and clamped reach, bend determinism,
  constraints, degenerate inputs, immutability, production wrist and
  butterfly targets, and the 13C fallback.

14B Status:
Complete

## 14C — Centralized Constraint Solve Pipeline

- [x] Add `resolveAnimationFrame()` as the authoritative immutable frame
  constraint path. Production recipe playback now interpolates an unsolved
  motion/choreography frame and sends it through this resolver exactly once.
- [x] Fix and publish the deterministic order: base/interpolated skeleton,
  motion primitives and authored overrides, grounding, active relational and
  contact correction, final joint constraints, then finite/structural
  validation. Recipe phase construction uses the same shared choreography
  composer instead of owning a second constraint pass.
- [x] Preserve exact authoritative source and destination skeletons by
  bypassing grounding, contacts, IK, fallback correction, and clamping at
  exact progress 0 and 1. The public transition path retains its equivalent
  exact pose endpoint guard.
- [x] Add the small generic `critical`, `high`, `medium`, and `low` priority
  model. Explicit metadata wins; otherwise grips default to critical, hooks
  to high, and pressure/control contacts to medium. Equal priorities use a
  canonical semantic contact key and original index as the final stable tie.
- [x] Feed the already lifecycle-resolved 14A contact targets into the frame
  resolver. Preserve/release/acquire strength and upstream Gi/No-Gi filtering
  remain owned by their existing compilation paths; the solver does not
  inspect technique, transition, control, or garment IDs.
- [x] Reuse 14B two-bone arm/leg IK and its bounded 13C single-joint fallback
  through `correctSkeletonContacts()`. Priority ordering is preserved by one
  contact-correction call, avoiding hidden IK or root-correction repeats.
- [x] Reuse root-translation grounding before relational correction and the
  existing joint-constraint profile after it. Static position authoring still
  calls the smaller grounding helper once while constructing immutable source
  poses because it is not animation-frame playback; those grounded endpoint
  transforms then remain authoritative.
- [x] Cover solve order, exact endpoints, grounding plus IK plus final
  clamping, conflicting priorities, canonical same-priority ordering, single
  application, immutability, determinism, finite/valid output, and IK fallback.

14C Status:
Complete

## 14D — Two-Grappler Relational Solving

- [x] Add `resolveGrapplerPairFrame()` as the production pair-level
  orchestration boundary while retaining `resolveAnimationFrame()` as the
  reusable Iteration 14C frame pipeline.
- [x] Keep relational targets semantic: every compiled contact carries its
  explicit source grappler/body landmark and target grappler/body landmark.
  Contact geometry is resolved from the current working skeleton pair
  immediately before each correction, so no world-space target or previous
  rendered frame is cached.
- [x] Use three bounded stages: one 14C choreography/grounding/ordinary-contact
  pass, one primary relational pass, and one opponent-follow refresh at 35%
  strength. The relational pass count is the exported constant
  `PAIR_RELATIONAL_PASS_COUNT = 2`; there is no recursion, convergence test,
  or data-dependent pass count.
- [x] Reuse the 14C `critical` / `high` / `medium` / `low` priority ordering
  and canonical semantic tie-break in both relational passes. That canonical
  order establishes primary ownership when both grapplers have relationships;
  the reduced pass repeats the same order instead of alternating ownership or
  ping-ponging until convergence.
- [x] Reuse 14B analytic arm/leg IK for hand and foot following and the bounded
  13C single-joint correction when IK cannot safely solve. Relational targets
  do not translate a grappler root; existing ordinary contact correction and
  grounding retain their prior behavior.
- [x] Route recipe keyframes and normal intermediate playback through the pair
  resolver. Preserve exact authoritative source and destination skeletons by
  returning the 14C endpoint bypass before relational passes.
- [x] Support the existing landmark-safe `wrist_control`, `sleeve_grip`,
  `collar_grip`, `ankle_control`, and `butterfly_hook` targets in either
  ownership direction. Preserve/release/acquire strengths and Gi/No-Gi
  filtering remain upstream and unchanged.
- [x] Keep underhooks, overhooks, seatbelts, and closed-guard connections on
  their existing ordinary-contact fallback; their torso/arm-region semantics
  are not force-fit onto hand or leg IK.
- [x] Cover moving current-frame wrist and thigh targets, reverse ownership,
  endpoint fidelity, fixed pass count, ordering, determinism, immutability,
  grounding, finite/constrained output, bone geometry, and unsupported-control
  fallback. Existing lifecycle, No-Gi, IK-failure, and joint-limit suites run
  through the same production dependencies.

14D Status:
Complete

## Iteration 14E â€” Constraint-Enhanced Showcase Techniques

- [x] Add the orthogonal `constraintEnhancements` recipe layer for semantic
  control relationships, reusable primitive overlays at existing phases, and
  source-to-destination grounding anchors. No second executor, solver, or
  per-frame pose system was introduced.
- [x] Enhance exactly three canonical transitions:
  - `open_guard_bottom_butterfly_sweep_to_side_control_top` retains explicit
    `butterfly-sweep-v1`; a lifecycle-gated right `butterfly_hook`, leg IK,
    grounding, paired rotation, pull, and follow motion keep the sweep coupled.
  - `half_guard_bottom_old_school_sweep_to_side_control_top` remains
    `sweep.rotation`; right `ankle_control` plus paired off-balance, rotation,
    pull, follow, and grounding motion carries both grapplers through reversal.
    Underhook behavior remains approximate rather than gaining a new solver.
  - `back_control_top_opponent_turn_in_to_half_guard_bottom` remains
    `escape.hip`; a releasing seatbelt contact and paired follow/rotation plus
    grounding maintain approximate close-body movement toward Half Guard.
    Seatbelt stays outside limb IK.
- [x] Keep exact authoritative progress 0/1 endpoints and route every enhanced
  frame through `resolveGrapplerPairFrame()` and the 14C/14D constraint order.
- [x] Report the enhancement metric independently: 65 total, 1 explicit, 27
  family, 37 fallback, and exactly 3 constraint-enhanced transitions.
- [x] Add intermediate progress and phase-boundary tests for target error,
  pair participation, finite/constrained output, bone lengths, grounding,
  determinism, immutability, Gi/No-Gi compatibility, and endpoint fidelity.
  The butterfly hook is measured at 0.2/0.4/0.6/0.8 with a 150px rig-scale
  ceiling and must improve on the same choreography with the hook disabled.
- [x] Preserve one mode-compatible recipe per transition. No Gi-only garment
  control is required by the enhancement layer; existing upstream filtering
  continues to remove incidental garment grips in No-Gi.

14E Status:
Complete

Known visual limitations: torso/spine IK, collision, physics, center of mass,
and global multi-contact solving remain deferred. Underhook and seatbelt stay
approximate; Old-School uses supported ankle control and family motion rather
than a new trapped-leg solver. The in-app browser was unavailable during the
14E verification session, so visual realism was not manually certified.

Iteration 14 Status:
In Progress

Explicitly deferred: full-body, torso, spine, iterative, physics, collision,
and center-of-mass solving; new positions or transitions; broader relational
types such as seatbelts, underhooks, and closed-guard body locks; and any
recursive two-grappler solving. Grounding remains sequential root translation,
so conflicting simultaneous anchors are not solved globally. Iteration 14D
now coordinates current-frame limb relationships across both grapplers;
Iteration 14E uses this infrastructure for three focused showcase transitions
without adding another low-level solver layer.

---

# Future Ideas

Potential future systems:
- Additional position artwork and transition choreography
- Scoring, strategy, stamina, skill, probability, and physics models
- Control-aware pathfinding (Pathfinder currently remains positional-only)
- Review of ownership-sensitive and manual-review transition metadata
- Review of the Toreando and old-school sweep split candidates
- Native mobile application
- Offline quick-reference tools
- Saved systems
- AI-assisted exploration
- Strategy analysis
- User-created systems
- Meme/funny interaction modes
- Competition preparation tools
- "How cooked am I?" position danger meter
- Roll statistics
- Community submissions
