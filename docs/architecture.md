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
one selected or random step, and bounded multi-step roll sequences. The first
interactive Roll Simulator UI uses the two single-step endpoints; Roll History
and Auto Roll remain future work.

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
* interactive, user-controlled Roll Simulator

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
changes, and next-state calculation. The current interface displays only the
last successful move; full Roll History and Auto Roll are deferred to Iteration
7E.

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
