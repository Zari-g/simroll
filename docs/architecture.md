# SimRoll — Architecture

## 1. Architecture Goal

SimRoll will start as a Python-based grappling engine and later expand into a website and mobile app.

The goal is to keep the project modular so the core simulation logic can be reused across different interfaces.

Initial focus:

* Python backend logic
* graph-based position system
* gi/no-gi filtering
* grip constraints
* pathfinding between positions

Future interfaces:

* web app
* mobile app
* API
* visual graph explorer

---

## 2. High-Level Architecture

SimRoll will be organized into layers:

```text
User Interface
    ↓
API Layer
    ↓
Simulation Engine
    ↓
Domain Models
    ↓
Data Layer
```

For the first version, only the lower layers will be built.

---

## 3. Layer 1 — Data Layer

The data layer stores positions, transitions, grips, and technique information.

At the beginning, this data will be stored in simple files such as YAML or JSON.

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
* Player State
* Roll State

These models describe what the system understands about Brazilian Jiu-Jitsu.

For example, a transition connects one position to another and may require specific grips.

---

## 5. Layer 3 — Simulation Engine

The simulation engine contains the main logic of SimRoll.

Responsibilities:

* load positions and transitions
* build the grappling graph
* find available transitions from a position
* check gi/no-gi rules
* check grip requirements
* find paths between positions
* simulate roll sequences

This is the heart of the project.

---

## 6. Layer 4 — API Layer

The API layer will allow the future website or mobile app to communicate with the Python engine.

Possible API endpoints:

* get all positions
* get one position
* get available transitions
* find path between two positions
* simulate a roll sequence

FastAPI will likely be used for this layer.

This layer will not be built immediately.

---

## 7. Layer 5 — User Interface

The user interface will be added later.

The website may include:

* position explorer
* transition viewer
* search bar
* graph visualization
* roll simulator interface

The mobile app may include:

* tap-based position navigation
* saved sequences
* quick training reference
* simplified roll simulation

The UI should feel playful, clear, and interactive.

---

## 8. First Technical Structure

The first Python version may use this structure:

```text
simroll/
│
├── docs/
│   ├── project-requirements.md
│   ├── roadmap.md
│   ├── architecture.md
│   └── bjj-domain-model.md
│
├── simroll/
│   ├── models/
│   │   ├── position.py
│   │   ├── transition.py
│   │   └── grip.py
│   │
│   ├── engine/
│   │   ├── graph.py
│   │   ├── simulator.py
│   │   └── pathfinder.py
│   │
│   ├── data/
│   │   ├── positions.yaml
│   │   ├── transitions.yaml
│   │   └── grips.yaml
│   │
│   └── api/
│       └── main.py
│
├── tests/
│   ├── test_models.py
│   └── test_graph.py
│
├── README.md
├── pyproject.toml
└── LICENSE
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

For the first version, SimRoll will not use realistic physics, animation, user accounts, or a database.

The first version will focus only on:

* modelling BJJ positions
* modelling transitions
* adding gi/no-gi logic
* adding grip constraints
* building graph-based pathfinding

This keeps the project realistic and expandable.
