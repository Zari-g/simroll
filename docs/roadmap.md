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

Full 19-position visual coverage, generalized inverse kinematics, and
broader mat/ground contact modeling remain deferred to later Iteration 13
work.

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
