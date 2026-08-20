# SimRoll — Data Design

## 1. Purpose

This document defines how SimRoll stores and organizes grappling data.

The goal is to create a system that is:

* easy to expand
* easy to understand
* Git-friendly
* beginner-friendly
* compatible with future web and mobile development
* suitable for graph-based simulations

---

# 2. Data Philosophy

SimRoll models Brazilian Jiu-Jitsu as a connected graph system.

Core idea:

* positions are nodes
* transitions are edges
* grips act as constraints
* rolls are sequences of connected states

The project prioritizes grappling logic over realistic body physics.

Instead of simulating actual cloth or body movement, SimRoll simulates:

* positional relationships
* available transitions
* grip requirements
* pathway logic
* decision branches

---

# 3. Initial Storage Strategy

The first version of SimRoll will use YAML files instead of a traditional database.

Reasons:

* easy to read
* easy to edit
* easy to version-control with Git
* easy to review manually
* simple for rapid Agile iteration
* beginner-friendly for contributors
* easier to prototype than a database

Example files:

```text
simroll/data/
│
├── positions.yaml
├── transitions.yaml
├── grips.yaml
├── tags.yaml
└── sources.yaml
```

The project may later migrate to PostgreSQL or Neo4j if scalability becomes necessary.

---

# 4. Position Data

Positions represent grappling states.

Examples:

* Closed Guard
* Mount
* Side Control
* Back Control
* Turtle
* Standing

Each position should contain:

* id
* name
* category
* player_role
* gi_allowed
* no_gi_allowed
* tags
* description

Example:

```yaml
- id: closed_guard_bottom
  name: Closed Guard Bottom
  category: guard
  player_role: bottom
  gi_allowed: true
  no_gi_allowed: true
  tags:
    - guard
    - bottom
    - closed_guard
  description: Bottom player controls opponent with legs closed around the waist.
```

---

# 5. Transition Data

Transitions represent movement between positions.

Examples:

* Knee Cut Pass
* Flower Sweep
* Arm Drag
* Hip Escape
* Back Take

Each transition should contain:

* id
* name
* from_position
* to_position
* transition_type
* required_grips
* created_grips
* removed_grips
* gi_allowed
* no_gi_allowed
* difficulty
* tags
* notes

The runtime retains `required_grips`, `created_grips`, and `removed_grips` as
compatibility projections for existing API/frontend consumers. Authoritative
requirements use `required_controls`, whose any-of clauses carry concrete
`player_a` / `player_b` owner and target identities plus applicable modes.
Created, removed, optional, reset, and preserved-control fields retain the
normalized lifecycle intent. Iteration 11D executes those fields in order:
reset, exact removal, exact addition, explicit preservation, compatibility
pruning, and final state validation. Optional controls remain descriptive and
never block a positional transition or acquire a control automatically.

Example:

```yaml
- id: flower_sweep
  name: Flower Sweep
  from_position: closed_guard_bottom
  to_position: mount_top
  transition_type: sweep
  required_grips:
    - sleeve_grip
  created_grips: []
  removed_grips: []
  gi_allowed: true
  no_gi_allowed: true
  difficulty: beginner
  tags:
    - sweep
    - closed_guard
```

---

# 6. Grip Data

Grips represent control points during grappling exchanges.

Examples:

* Collar Grip
* Sleeve Grip
* Pant Grip
* Wrist Control
* Underhook
* Overhook

Each grip should contain:

* id
* name
* grip_type
* gi_required
* control_target
* dominant_hand
* tags

Grip records define the control vocabulary. Runtime `ActiveControl` values add
the stable `owner` and `target` player identities to a referenced control ID.
Position roles such as top and bottom never replace those identities.

Example:

```yaml
- id: cross_collar_grip
  name: Cross Collar Grip
  grip_type: collar
  gi_required: true
  control_target: upper_body
  dominant_hand: right
  tags:
    - gi
    - collar
    - posture_control
```

---

# 7. Gi System Design

SimRoll will not simulate realistic cloth physics.

Instead, gi interactions will be modelled through grip constraints.

Example:

A cross collar choke may require:

* cross collar grip
* second collar grip

This approach is:

* simpler
* more scalable
* easier to maintain
* more realistic for early versions

Gi logic will mainly affect:

* available transitions
* transition requirements
* control states
* pathway availability

---

# 8. Graph Representation

SimRoll represents grappling using directed graphs.

Structure:

```text
Position → Transition → Position
```

Example:

```text
Closed Guard Bottom
    ↓
Flower Sweep
    ↓
Mount Top
```

This structure allows:

* pathfinding
* roll simulation
* transition lookup
* branching pathways
* position analysis

---

# 9. Initial Dataset Strategy

The first version of SimRoll will use a small manually curated dataset.

Initial goal:

* 10–15 positions
* 20–30 transitions
* 10–15 grips

This dataset will be enough to:

* validate the architecture
* test graph traversal
* test grip constraints
* build the first simulation logic

The dataset will expand gradually during later iterations.

## 9.1 Curated MVP import boundary

Iteration 11A introduced `simroll_bjj_mvp_v1` through dedicated Pydantic import
models and one canonical generated JSON artifact. Iteration 11C makes runtime
YAML a deterministic, human-readable projection of that artifact. Original
positions and positional/submission transitions remain distinct from five
parameterized control-change templates.

This import contract preserves data that current runtime models cannot yet
represent, including two-player roles, control ownership templates, optional
and preserved controls, mode classifications, review queues, confidence, and
source evidence. See `docs/dataset-contract.md` for the complete mapping.

The active runtime remains:

```text
simroll/data/positions.yaml
simroll/data/transitions.yaml
simroll/data/grips.yaml
```

The active runtime contains 20 positions (19 live plus
`submission_terminal`), 65 positional/submission transitions (including 10
submissions), and 17 controls. All live positions form one strongly connected
component. Position `allowed_controls` arrays, control mode flags, and the four
normalized owner-role constraint forms provide the intentionally small
destination compatibility layer. An omitted allowlist on a legacy/custom
fixture remains unmodeled; runtime dataset positions always provide one.
The five control-change templates are now loaded directly from the normalized
11A artifact. They remain unexpanded at load time. Legal-action generation
resolves `$control_id`, `$from_control_id`, actor, and opponent only for a
specific validated state, filtering by mode, position allowlist, owner role,
existing controls, and the 17-control vocabulary. These runtime actions remain
separate from the 65 positional/submission transitions and are never inserted
as graph edges.

The normalized artifact's five Gi and five No-Gi example rolls are executable
regression fixtures. Each fixture is replayed without rewriting its sequence:
source position, mode legality, owned-control requirements, destination,
resulting controls, acting player, and stable player identity are checked at
every event. Their long-roll target uses the recorded positional-transition
count (11--15), excluding same-position control changes. Seeded random tests
supplement these curated fixtures but allow legitimate early submissions.

`submission_terminal` is a safe terminal node, not proof that a submission was
executed. Submission termination is attached to the executed submission edge;
starting directly at the terminal node produces no synthetic edge or metadata.

Runtime YAML must not be edited independently of the normalized artifact. Run
`python scripts/build_runtime_data.py` to regenerate it and
`python scripts/build_runtime_data.py --check` to verify freshness without
writing. Regression coverage also preserves the manual-review metadata: 30
ownership-sensitive records, 11 manual-review transitions, and the Toreando and
old-school sweep future split candidates. These are future review items, not
Iteration 11 changes.

---

# 10. Future Database Possibilities

Possible future storage systems:

## PostgreSQL

Useful for:

* structured relational storage
* user systems
* saved pathways
* accounts
* analytics

## Neo4j

Useful for:

* graph traversal
* advanced pathway analysis
* relationship-heavy queries
* transition discovery

The first version does not require a database.

---

# 11. Data Sources

Initial data sources may include:

* personal BJJ knowledge
* manually curated technique lists
* rewritten educational references
* training notes
* public terminology

The project should avoid directly copying copyrighted instructional content.

---

# 12. Design Principles

The SimRoll data system should be:

* modular
* expandable
* human-readable
* easy to maintain
* easy to validate
* easy to visualize
* suitable for Agile iteration
* suitable for future API integration
