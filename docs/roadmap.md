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

Planned: adapt the normalized positions and positional transitions into the
runtime graph after the 11B ownership boundary is complete.

11C Status:
Future

Iteration 11 Status:
In progress

---

# Future Ideas

Potential future systems:
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
