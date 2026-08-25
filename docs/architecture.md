# SimRoll — Architecture

## 1. Architecture Goal

SimRoll is a Python-based grappling engine with a FastAPI interface and React web application, and may later expand into a mobile app.

The goal is to keep the project modular so the core simulation logic can be reused across different interfaces.

Initial focus:

* Python backend logic
* graph-based position system
* gi/no-gi filtering
* grip constraints
* pathfinding between positions

Current and future interfaces:

* React web app (implemented)
* mobile app
* visual graph explorer (implemented)

---

## 2. High-Level Architecture

SimRoll is organized into layers:

```text
React / TypeScript Frontend
    ↓
FastAPI Layer
    ↓
Simulation Engine
    ↓
Domain Models
    ↓
YAML Data
```

The frontend, FastAPI layer, and lower layers are implemented. The frontend
collects path and roll setup criteria and presents returned states, while
pathfinding, roll execution, and grappling rules remain backend-owned.

---

## 3. Layer 1 — Data Layer

The data layer stores positions, transitions, grips, and technique information.

The active curated MVP data is stored in YAML files and loaded into validated
runtime domain models. The curated-data boundary is:

```text
external curated JSON
    -> strict import contract and validation
    -> canonical normalized JSON
    -> human-readable runtime YAML
    -> runtime domain models and graph
```

Iteration 11 derives the runtime YAML from the canonical normalized artifact.
`GrapplingGraph.from_default_data()` now loads 20 positions, 65 positional and
submission transitions, and 17 controls. The five control-change templates
load from the normalized artifact and remain outside the positional graph.
`python scripts/build_runtime_data.py --check` verifies that committed YAML is
the exact deterministic projection of the normalized source.

Example data:

* positions
* transitions
* grips
* tags
* difficulty levels

Later, the project may use a database such as PostgreSQL or Neo4j.

---

## 4. Layer 2 — Domain Models

The domain models define the main objects in the system.

Core models:

* Position
* Transition
* Grip
* ActiveControl
* GrapplingState
* GrapplingPath

These models describe what the system understands about Brazilian Jiu-Jitsu.

For example, a transition connects one position to another and may require
specific controls. `ActiveControl` identifies a control, its owning player, and
its target player. `GrapplingState` represents an immutable, hashable position,
mode, and player-owned-control snapshot, while `GrapplingPath` represents a
valid sequence of those complete states. Player identity is stable; positional
roles are derived from the current position and may change after a sweep or
reversal. Roll simulation reuses these models without adding simulation
behavior to them.

Runtime transition requirements resolve normalized `actor` / `opponent`
templates to stable player IDs before graph loading. Positional transitions
execute the normalized control lifecycle centrally in `control_semantics.py`:

```text
validate source state and required controls
    -> resolve destination
    -> reset/clear controls
    -> remove exact owned controls
    -> add exact owned controls
    -> restore only explicitly preserved controls
    -> prune destination/mode-incompatible controls
    -> validate resulting state
```

An owned-control identity is its control ID, owner, and target. Optional
controls do not affect legality or create controls. Explicit additions must be
valid; preservation is conservative and succeeds only when the same owned
control was active before the move and remains valid for the destination role,
position allowlist, and mode.

---

## 5. Layer 3 — Simulation Engine

The simulation engine contains the main logic of SimRoll.

Responsibilities:

* use `GrapplingGraph` to load data and represent positions and transitions
* apply transition rules for gi/no-gi modes and owned-control requirements
* validate grappling states
* execute transitions as immutable state updates
* enforce destination position, owner-role, and Gi/No-Gi control compatibility
* use `GrapplingPathfinder` for shortest and multiple path searches
* use `RollSimulator` for user-directed steps and bounded random roll sequences

This is the heart of the project. `RollSimulator` delegates state validation,
transition availability, and transition application to `GrapplingGraph`, keeping
the graph authoritative for grappling rules. The API exposes available choices,
one selected or random step, and bounded multi-step roll sequences. The
interactive Roll Simulator uses both single-step endpoints and the multi-step
simulation endpoint while leaving every state change backend-owned.

---

## 6. Layer 4 — API Layer

The implemented FastAPI layer allows HTTP clients, including the current web
interface, to communicate with the Python engine.

Its responsibilities are:

* position access
* transition access
* grip access
* available-transition queries for a grappling state
* shortest path search
* multiple path search
* available roll-step choices
* selected or random single roll steps
* bounded random multi-step roll sequences

The API remains a thin HTTP layer. Grappling rules, validation, transition execution, and pathfinding stay in the engine rather than in route handlers.

Multi-step roll requests preserve the same ownership boundary:

```text
RollSimulationRequest
    -> RollSimulator.simulate()
    -> GrapplingPath
    -> GrapplingPathResponse
    -> RollSimulationResponse
```

---

## 7. Layer 5 — User Interface

The React / TypeScript website includes:

* searchable Position Explorer
* Position Detail and grip-aware Transition Viewer
* Gi / No-Gi and active-grip state controls
* interactive structural Grappling Map
* backend-powered shortest and multiple-path Pathfinder
* path-result highlighting on the existing graph
* interactive Roll Simulator with manual branching and Surprise Me
* complete in-session Roll History with display-only grip differences
* bounded 5- and 10-step Auto Roll with continued manual branching

Path requests follow this ownership flow:

```text
Pathfinder form
    -> FastAPI pathfinding endpoint
    -> GrapplingPathfinder
    -> returned GrapplingPath
    -> readable result and optional graph highlight
```

The frontend highlights the position and transition IDs returned by the API. It
does not discover paths, infer reachability, calculate grip changes, or execute
the route.

Interactive roll steps follow this ownership flow:

```text
RollSimulator.tsx
    -> frontend API client
    -> FastAPI /rolls/available or /rolls/step
    -> RollSimulator backend
    -> GrapplingGraph
    -> authoritative next state rendered by React
```

React owns setup selections, the current returned state, and loading/error UI.
The backend owns transition availability, validation, random selection, grip
changes, and next-state calculation.

Auto Roll follows the same boundary at path scale:

```text
current authoritative state
    -> frontend API client
    -> FastAPI POST /rolls/simulate
    -> RollSimulator backend
    -> authoritative GrapplingPath
    -> validate and merge returned states + transition IDs
    -> continue manual branching from the returned final state
```

The frontend history is one `{ states, actions }` value that maintains
`states.length === actions.length + 1`. A single step appends the typed action
and `next_state` returned by `/rolls/step`. An Auto Roll appends the returned
typed actions and authoritative states without duplicating its current-state
prefix. `RollHistory.tsx` resolves readable metadata and compares consecutive
authoritative states only to display player-owned control additions and
releases; it never applies actions or decides grappling validity.

Grappler graphics preserve the same frontend ownership boundaries. A single
display-state boundary selects configured, live, historical, or animated
position, mode, and grip data without changing authoritative simulation state.
Position and transition systems resolve poses; anatomy, appearance, contact,
and occlusion metadata remain independent reusable inputs:

```text
authoritative grappling state
    -> position visual
    -> local kinematic skeleton (for migrated poses)
    -> resolved world joints
    -> derived renderer segments
    -> resolved pose + grip modifiers
    -> transition interpolation
    -> anatomy + body geometry + appearance
    -> contact + occlusion metadata
    -> reusable layered SVG grapplers
    -> live, animated, or historical scene
```

The kinematic model is pelvis-rooted. Pelvis, spine, chest, neck, and head form
a locally articulated core: pelvis rotation orients the full body, spine
flexion changes the chest/head position, and chest rotation reorients the
upper body relative to the hips. Shoulders are anatomy-derived offsets from
the chest; hips are anatomy-derived offsets from the pelvis; and the head is
attached through explicit chest-to-neck and neck-to-head offsets. Elbows,
wrists, knees, and ankles inherit down their respective connected limb chains.

Anatomy owns structural lengths and spans alongside visual proportions:
pelvis-to-spine length, spine-to-chest length, shoulder span, hip span, neck
length, and head offset. Pose definitions own only root placement, local
rotations, flexion, and limb articulation. This separation lets one anatomy be
reused across poses without embedding widths, apparel, or SVG style in pose
data.

Authored local skeleton transforms are authoritative. Forward kinematics
produces world joints, a resolved core description, and renderer-compatible
`GrapplerPose` segments. `GrapplerPose` also carries optional renderer-facing
pelvis, spine, and chest points derived from those world joints. The SVG torso
uses them to build a lightweight curved silhouette with anatomy-driven waist,
midsection, and shoulder cross-sections; apparel details reuse the same
landmarks. The pelvis-to-chest chord remains available for legacy poses,
contacts, and transition compatibility. All visible geometry is derived rather
than separately authored, and no forward-kinematic calculation occurs in React
or SVG components.

Before forward kinematics, skeleton-backed poses pass through a reusable local
constraint boundary:

```text
authored local skeleton
    -> joint constraint validation
    -> safe/constrained local skeleton
    -> forward kinematics
    -> resolved world joints
    -> renderer geometry
```

The default profile stores normalized parent-relative rotation ranges separately
from pose definitions. Validation reports rotation and structural problems for
authoring tools and tests; correction returns a fresh pose, normalizes wrapped
angles, and clamps only constrained rotations. Missing joints, non-finite
transforms, invalid structural lengths, and broken hierarchy references remain
explicit structural errors rather than being hidden by invented geometry.
Development diagnostics run once when articulated position visuals are created,
not on animation frames. These ranges are deliberately approximate visual
guardrails for a 2D grappler, not medical-grade biomechanics or physics.

Iterations 10A through 10D retain an incremental migration boundary. A pure
legacy-pose adapter can normalize existing independently positioned segments
into a connected skeleton, while the anatomy-backed articulated authoring path
builds new local skeletons directly. A second adapter converts either resolved
skeleton path to the existing renderer contract. Closed Guard, Mount, and Side
Control top/bottom figures use the articulated path and expose their resolved
core curvature to the torso renderer; future visuals can migrate gradually.
Both paths still reach the same grip, contact, interpolation, apparel, and
rendering contracts, including exact source and destination animation frames.

Semantic transitions and visual choreography are intentionally separate. The
backend graph remains authoritative for legality, source and destination state,
mode, controls, and simulation results. An animation recipe is optional visual
metadata keyed by a transition ID; it cannot redefine either semantic endpoint.
A centralized resolver is the sole playback and coverage-policy boundary. It
selects an explicit recipe first, then compiles family-backed authoring into a
normal recipe, and otherwise returns deterministic eased
source-to-destination interpolation with a predictable fallback duration.
Missing visual choreography is therefore safe.

Recipes declaratively compose reusable pure motion primitives, timing offsets,
ordered intermediate phases, and narrowly scoped local skeleton overrides. The
primitive vocabulary is organized around technique-agnostic core/base, arm,
leg, and relative movement mechanics. Parameters such as side, amount, path,
direction, angle, and distance express variations without technique functions.
Registry construction validates IDs, durations, ordering, progress bounds,
finite primitive payloads, overrides, and reserved contact-requirement metadata
once during module initialization. The recipe compiler remains technique-agnostic.
Generated phases are constrained, then the existing contact pass applies capped
root-space corrections for the strongest anchors. Per-grappler phase offsets
let hips, torso, arms, and head lead or follow before interpolation produces
connected renderer geometry:

```text
authoritative semantic transition
    -> explicit recipe OR family compilation OR fallback
    -> resolved animation (source, recipe, duration)
    -> primitive-driven motion phases + local authored overrides
    -> constrained skeleton keyframes
    -> prioritized contact correction
    -> grouped timing + eased keyframe interpolation
    -> renderer
```

The hip bump sweep, flower sweep, elbow escape, and mount-to-side-control
animations are recipe data and retain their existing choreography. Contact
correction translates a contacted grappler as a bounded whole and does
not rotate joints, solve limb chains, or attempt to satisfy every declaration.
It is deterministic and immutable, and preserves already-valid local joint
constraints. This remains authored choreography rather than physics, collision
handling, or general IK. Source and destination frames bypass intermediate
generation so their resolved poses remain exact, including grip-modified
endpoints. Missing transition choreography uses the safe interpolation fallback.
Coverage classification (`explicit`, `family`, or `fallback`) calls the same
resolver as playback and cannot drift into a separate source of truth.
Semantic controls now resolve through an immutable visual control registry.
Each reusable definition relates controller/opponent landmarks (hand, wrist,
arm, torso, leg, and similar small regions) and compiles to ordinary weighted
contacts before the existing correction pass:

```text
backend-owned semantic controls
    -> reusable side-aware control target definitions
    -> weighted grip/control/hook/pressure contacts
    -> existing bounded contact correction
    -> constrained skeleton pose
```

Gi and No-Gi therefore keep the same canonical position visuals: garment
controls such as collar/sleeve grips and body/limb controls such as underhooks
or wrist control change the active relationships, not the position graph.
Decorative grip marks remain optional consumers of control state and are not
the physical-contact source of truth. Recipe metadata can visually preserve,
release, or acquire a relationship and blends source/destination influence
through intermediate frames. It never changes backend semantic state, and
exact authoritative endpoints continue to bypass correction. Technique-family
templates, generalized IK, and broader graph choreography remain deferred to
12D and later Iteration 12 work.

The position visual's `playerOrder` and anatomy `layerHint` values provide the
default body-part order. Small position-owned occlusion overrides may move an
explicit body part before or after another body part when grappling requires an
interleaved overlap. Typed position contacts remain separate from active grip
contacts, and pure anchor helpers derive both from the displayed pose:

```text
position visual + resolved pose + anatomy + appearance
    -> default layered body parts + targeted occlusion overrides
    -> pose-derived position contacts + active grip contacts
    -> final SVG scene
```

Contacts derive their anchors from the displayed pose, so live transitions,
Auto Roll steps, and historical replay use the same moving geometry. Transition
start and end frames use their exact source and destination display states. The
same source/destination contact sets feed authored intermediate correction in
manual steps, Auto Roll, and historical replay.

The static core position registry currently covers all backend position IDs:
Closed Guard Bottom, Mount Top, and Side Control Top. Closely related positions
can derive immutable variants from an existing pose while overriding only the
segments that change. Unknown or future position IDs still resolve to the
existing visual fallback.

The mobile app may include:

* tap-based position navigation
* saved sequences
* quick training reference
* simplified roll simulation

The UI should feel playful, clear, and interactive.

---

## 8. Current Technical Structure

The current Python package uses this structure:

```text
simroll/
├── api/
│   ├── __init__.py
│   ├── app.py
│   ├── dependencies.py
│   └── schemas.py
│
├── engine/
│   ├── graph.py
│   ├── pathfinder.py
│   ├── rules.py
│   └── simulator.py
│
├── models/
│   ├── position.py
│   ├── transition.py
│   ├── grip.py
│   ├── state.py
│   └── path.py
│
└── data/
    ├── positions.yaml
    ├── transitions.yaml
    └── grips.yaml
```

---

The import-layer models and importer live under `simroll/datasets/`. Curated
source and generated integration artifacts live outside the runtime package
under `data/curated/` and `data/generated/`. The repeatable entry point is
`scripts/import_bjj_mvp.py`.

## 9. Design Principles

SimRoll should be:

* modular
* easy to expand
* beginner-friendly
* testable
* playful but technically solid
* built in small Agile iterations
* suitable for web and mobile expansion

---

## 10. Current Architecture Decision

The current version of SimRoll does not use realistic physics, animation, user accounts, or a database.

The current version focuses on:

* modelling BJJ positions
* modelling transitions
* adding gi/no-gi logic
* adding grip constraints
* building graph-based pathfinding
* exposing the engine through a thin FastAPI layer
* validating a richer curated dataset before runtime migration

### Positional transitions and control changes

Iteration 11E keeps two action kinds explicit. A positional `Transition` is a
graph edge and may change `position_id`; a `ControlChange` is instantiated from
one of five templates for a specific state and changes only owned controls.
Both carry `action_type` in roll API payloads. Control changes preserve
position, mode, and stable player identities.

The simulator selects from the combined legal action set and reports
`positional_steps`, `control_actions`, and `total_events`. Its existing
`max_steps` limit bounds total events, and an identical control action is not
selected twice consecutively. The pathfinder intentionally continues to
enumerate positional graph edges only; same-position control changes are not
part of BFS in 11E.

Iteration 11F makes termination part of the domain simulation result. An
executed submission transition stops immediately with `stop_reason` set to
`submission`, ahead of the event-limit and no-action checks. Merely starting at
`submission_terminal` executes no submission and therefore reports
`no_available_transitions`. The API serializes the domain-owned reason together
with all three counters; `step_count` remains a total-event compatibility alias.

Long-roll capability is measured with `positional_steps`, never total events.
Integration tests replay all ten normalized 11A example rolls step by step and
also validate deterministic seeded random runs in both Gi and No-Gi. Random
runs may end early in a valid submission and are not each required to reach an
artificial minimum length.

Iteration 11G connects the frontend to the complete semantic MVP catalog: 20
positions, 65 positional/submission transitions, and 17 control definitions.
Position, graph, detail, roll, history, and Pathfinder views use API names and
retain control owner/target identity in readable text. The graph is shared by
Gi and No-Gi; mode-specific legality remains backend-owned.

Visual coverage remains intentionally partial. Closed Guard, Mount, and Side
Control retain their articulated scenes, and registered choreography continues
to animate unchanged. Positions without authored artwork use the explicit
"visualization coming soon" fallback. Transitions without registered
choreography commit the authoritative destination state directly and never
borrow interpolation from another move. Control-change actions update controls
in place without body choreography. Later iterations can expand artwork and
choreography independently from this semantic data integration.

Iteration 12D adds a declarative technique-family layer at the animation
authoring boundary. An authored entry is either an explicit `AnimationRecipe`
or a family ID plus validated parameters and small recipe-level overrides.
Family templates define reusable phases, primitive choreography, timing, and
visual control lifecycle defaults. The resolver compiles parameter references
before playback and produces the same validated `AnimationRecipe` consumed by
the family-agnostic interpolation pipeline.

Families never define semantic outcomes: backend transitions remain
authoritative, unknown family IDs fail during authoring, and unusual movement
can stay explicit. The initial registry contains rotation-sweep, hip-escape,
and step-over-advance patterns. Iteration 12E centralizes resolution and safe
coverage; graph-wide coverage authoring and reporting remain deferred to 12F.

Iteration 11 closes on one runtime equation:

```text
Position + mode + stable players + owned controls
    -> legal action
    -> updated validated state
```

A legal action is either a positional transition or a same-position control
change. Gi and No-Gi share the canonical position graph. Garment controls are
Gi-only; limb and body controls can be legal in either mode. Pathfinder remains
positional-only.

The legacy `/grips` resource name, transition `required_grips` / `created_grips`
/ `removed_grips` projections, roll `transition_ids`, roll `step_count`, and
single-step response field `transition` remain for existing API/frontend
consumers. New roll code uses owned controls, typed `actions`, `action_ids`, and
the explicit event counters. Frontend flat-ID/starter adapters remain narrowly
scoped to setup selectors and are marked as legacy; live and historical states
use owned controls.

This keeps the project realistic and expandable.
