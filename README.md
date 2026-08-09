# SimRoll

SimRoll is a playful Brazilian Jiu-Jitsu simulation project for exploring positions, transitions, escapes, submissions, and gi/no-gi grappling pathways.

The goal is to build an interactive system where users can move through BJJ positions like a roll simulator, starting with a Python-based graph engine and eventually expanding into a website and mobile app.

## Project Goals

- Model BJJ positions as states
- Model transitions as movements between states
- Support gi and no-gi pathways
- Add grip-based logic for gi techniques
- Build a backend simulation engine first
- Expand into an interactive website later
- Eventually explore a mobile app version

## Current Status

Iterations 1-5 are complete. SimRoll currently provides validated Pydantic
models and YAML data, a directed graph engine, immutable grappling-state
updates, state-aware pathfinding, and a thin HTTP API over the engine.

## Grappling State

`GrapplingState` is an immutable snapshot containing the current position,
grappling mode, and active grip IDs. `GrapplingGraph.apply_transition()` checks
the state and transition constraints, then returns a new state with the
transition's grip removals and creations applied.

```python
from simroll.engine import GrapplingGraph
from simroll.models import GrapplingState

graph = GrapplingGraph.from_default_data()
state = GrapplingState(
    position_id="closed_guard_bottom",
    mode="gi",
    active_grips=["wrist_control"],
)

next_state = graph.apply_transition(state, "hip_bump_sweep")

assert next_state.position_id == "mount_top"
assert next_state.active_grips == frozenset({"underhook"})
assert state.position_id == "closed_guard_bottom"
```

## State-Aware Pathfinding

`GrapplingPathfinder` searches over complete states: position, grappling mode,
and active grips. This allows a path to revisit a position after creating or
removing a grip, while still respecting gi/no-gi and transition requirements.

```python
from simroll.engine import GrapplingGraph, GrapplingPathfinder
from simroll.models import GrapplingState

graph = GrapplingGraph.from_default_data()
pathfinder = GrapplingPathfinder(graph)

start = GrapplingState(
    position_id="closed_guard_bottom",
    mode="gi",
    active_grips=["wrist_control"],
)

path = pathfinder.find_shortest_path(start, "mount_top")

assert path is not None
assert path.transition_ids == ("hip_bump_sweep",)
assert path.final_state.position_id == "mount_top"
```

Searches can be limited by transition difficulty and type:

```python
filtered_path = pathfinder.find_shortest_path(
    start,
    "mount_top",
    difficulties={"beginner"},
    transition_types={"sweep"},
)
```

## API

Install the application locally from the project root:

```bash
python -m pip install -e .
```

Run the FastAPI application locally from the project root:

```bash
python -m uvicorn simroll.api.app:app --reload
```

Interactive API documentation is available at `/docs` and can be used to try
each endpoint. The API exposes:

```text
GET /
GET /health
GET /positions
GET /positions/{position_id}
GET /positions/{position_id}/transitions
GET /grips
GET /grips/{grip_id}
GET /transitions
GET /transitions/{transition_id}
POST /transitions/available
POST /paths/shortest
POST /paths
```

For example, find the shortest path from closed guard bottom to mount top:

```bash
curl -X POST http://127.0.0.1:8000/paths/shortest \
  -H "Content-Type: application/json" \
  -d '{
    "start_state": {
      "position_id": "closed_guard_bottom",
      "mode": "gi",
      "active_grips": ["wrist_control"]
    },
    "target_position_id": "mount_top"
  }'
```

## Tech Stack

- Python
- NetworkX
- Pydantic
- PyYAML
- FastAPI
- pytest

The full test suite runs automatically on pushes and pull requests through
GitHub Actions.

FastAPI is kept as a thin HTTP layer over the framework-independent engine.
React / TypeScript remain possible future layers.

## Development

Install the development dependencies and run the complete test suite:

```bash
python -m pip install -e ".[dev]"
python -m pytest
```
