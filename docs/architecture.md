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

The current starter data is stored in YAML files and loaded into validated domain models.

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
* GrapplingState
* GrapplingPath

These models describe what the system understands about Brazilian Jiu-Jitsu.

For example, a transition connects one position to another and may require specific grips. `GrapplingState` represents an immutable position, mode, and active-grip snapshot, while `GrapplingPath` represents a valid sequence of those states. Roll simulation reuses these models without adding simulation behavior to them.

---

## 5. Layer 3 — Simulation Engine

The simulation engine contains the main logic of SimRoll.

Responsibilities:

* use `GrapplingGraph` to load data and represent positions and transitions
* apply transition rules for gi/no-gi modes and grip requirements
* validate grappling states
* execute transitions as immutable state updates
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

The frontend history is one `{ states, transitionIds }` value that maintains
`states.length === transitionIds.length + 1`. A single step appends the
transition and `next_state` returned by `/rolls/step`. An Auto Roll appends all
returned transition IDs and `path.states.slice(1)`, avoiding duplication of its
current-state prefix. `RollHistory.tsx` resolves readable metadata and compares
consecutive authoritative states only to display grip additions and releases;
it never applies transitions or decides grappling validity.

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

This keeps the project realistic and expandable.
