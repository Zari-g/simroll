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

Iterations 1-6 are complete. Iterations 7A and 7B add the backend roll
simulation engine and its single-step API; multi-step roll API and UI work
remain future iterations. The web interface includes the frontend foundation,
Position Explorer and search, Position Detail and its grip-aware transition
viewer, the interactive structural Grappling Map, and the backend-powered
Pathfinder.
SimRoll currently provides validated Pydantic models and YAML data, a directed
graph engine, immutable grappling-state updates, state-aware pathfinding, random
and user-directed roll simulation, a thin HTTP API over the existing engine
features, and a React frontend for browsing positions and
inspecting grip-aware transition availability for a selected grappling state.
The Pathfinder discovers shortest or multiple valid paths through the API,
shows the complete returned position/mode/grip state at every step, and can
highlight any returned route on the structural Grappling Map. Position nodes,
named directed transition edges, parallel transition routing, and
graph-to-position-detail navigation remain available around the highlighted
path.

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

## Roll Simulation Engine

`RollSimulator` advances complete grappling states through transitions validated
and applied by `GrapplingGraph`. Callers can select a transition, request one
random valid step, or generate a bounded random `GrapplingPath`. Supplying a
seeded `random.Random` makes random rolls repeatable.

```python
import random

from simroll.engine import GrapplingGraph, RollSimulator
from simroll.models import GrapplingState

graph = GrapplingGraph.from_default_data()
simulator = RollSimulator(graph)
start = GrapplingState(
    position_id="closed_guard_bottom",
    mode="gi",
    active_grips=["wrist_control"],
)

path = simulator.simulate(start, max_steps=4, rng=random.Random(7))
```

The simulator is exposed through single-step API endpoints for retrieving valid
choices and applying either a selected or random transition. Multi-step
simulation endpoints and frontend controls remain future work.

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
POST /rolls/available
POST /rolls/step
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
- React
- TypeScript
- Vite
- React Flow (`@xyflow/react`)

The full test suite runs automatically on pushes and pull requests through
GitHub Actions.

FastAPI is kept as a thin HTTP layer over the framework-independent engine.
The React / TypeScript frontend consumes that API without duplicating engine
or domain logic.

## Frontend Development

Install and run the backend from the repository root:

```bash
python -m pip install -e .
python -m uvicorn simroll.api.app:app --reload
```

In a second terminal, install and run the frontend:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. Vite proxies the frontend's `/api` requests to
the backend at `http://127.0.0.1:8000`, so local backend CORS changes are not
needed.

Use the Positions / Grappling map / Pathfinder switch to move among the
searchable position list, interactive structural graph, and path search form.
Position Detail lets users set Gi or No-Gi mode, choose active grips, and inspect
backend-reported transition availability for that state.

Pathfinder accepts a starting position, supported grappling mode, starting grips,
target position, and optional difficulty/type/depth limits. It calls
`POST /paths/shortest` for the shortest valid route or `POST /paths` for multiple
engine-ordered routes. Returned states and active grips are displayed directly;
the frontend does not execute transitions or reproduce pathfinding rules. Use
**Show on grappling map** on a result to emphasize its returned position and
transition IDs while retaining the rest of the structural map, then **Clear path
highlight** to restore the normal map.

`VITE_API_BASE_URL` configures the browser-facing API base path and defaults to
`/api`. `VITE_API_PROXY_TARGET` configures the local proxy destination and
defaults to `http://127.0.0.1:8000`. See `frontend/.env.example` for the local
development values; put personal overrides in `frontend/.env.local`.

## Development

Install the development dependencies and run the complete test suite:

```bash
python -m pip install -e ".[dev]"
python -m pytest
```
