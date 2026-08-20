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

Iterations 1-11 are complete. The semantic runtime contains exactly 20
positions (19 live plus `submission_terminal`), 65 positional/submission
transitions (10 submissions), 17 controls, and five parameterized same-position
control-change templates. All 19 live positions form one strongly connected
component.

SimRoll provides validated Pydantic models and deterministically generated YAML
data, stable player-owned controls, Gi/No-Gi legality, lifecycle-aware state
updates, pathfinding, deterministic and random roll simulation, submission
termination, a thin HTTP API, and a React frontend. The frontend supports the
complete semantic dataset across Explorer, Position Detail, Pathfinder, Roll
Simulator, Auto Roll, history, and playback. Artwork and choreography remain
intentionally partial and use explicit safe fallbacks.
The Pathfinder discovers shortest or multiple valid paths through the API,
shows the complete returned position/mode/control state at every step, and can
highlight any returned route on the structural Grappling Map. The Roll Simulator
lets users configure a starting state, advance through backend-authoritative
manual or random steps, inspect one continuous history, and continue branching
after bounded Auto Rolls. Position nodes,
named directed transition edges, parallel transition routing, and
graph-to-position-detail navigation remain available around the highlighted
path.

## Grappling State

`GrapplingState` is an immutable, hashable snapshot containing the current
position, grappling mode, and player-owned controls. Player identities stay
fixed as `player_a` and `player_b`; top and bottom are roles derived from the
current position. `GrapplingGraph.apply_transition()` checks the state and
transition constraints, then returns a new state with matching owned controls
removed or created.

```python
from simroll.engine import GrapplingGraph
from simroll.models import ActiveControl, GrapplingState

graph = GrapplingGraph.from_default_data()
state = GrapplingState(
    position_id="closed_guard_bottom",
    mode="gi",
    active_controls=[
        ActiveControl(
            control_id="wrist_control",
            owner="player_a",
            target="player_b",
        )
    ],
)

next_state = graph.apply_transition(
    state, "closed_guard_bottom_hip_bump_to_mount_top"
)

assert next_state.position_id == "mount_top"
assert next_state.active_controls == frozenset()
assert state.position_id == "closed_guard_bottom"
```

## State-Aware Pathfinding

`GrapplingPathfinder` searches over complete states: position, grappling mode,
and player-owned controls. It intentionally traverses positional transitions
only; same-position control changes belong to roll simulation.

```python
from simroll.engine import GrapplingGraph, GrapplingPathfinder
from simroll.models import ActiveControl, GrapplingState

graph = GrapplingGraph.from_default_data()
pathfinder = GrapplingPathfinder(graph)

start = GrapplingState(
    position_id="closed_guard_bottom",
    mode="gi",
    active_controls=[
        ActiveControl(
            control_id="wrist_control",
            owner="player_a",
            target="player_b",
        )
    ],
)

path = pathfinder.find_shortest_path(start, "mount_top")

assert path is not None
assert path.transition_ids == (
    "closed_guard_bottom_hip_bump_to_mount_top",
)
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

`RollSimulator` advances complete grappling states through positional
transitions and same-position control changes validated by `GrapplingGraph`.
Callers can select an action, request one random valid step, or generate a
bounded `RollSimulation`. Supplying a seeded `random.Random` makes random rolls
repeatable.

```python
import random

from simroll.engine import GrapplingGraph, RollSimulator
from simroll.models import ActiveControl, GrapplingState

graph = GrapplingGraph.from_default_data()
simulator = RollSimulator(graph)
start = GrapplingState(
    position_id="closed_guard_bottom",
    mode="gi",
    active_controls=[
        ActiveControl(
            control_id="wrist_control",
            owner="player_a",
            target="player_b",
        )
    ],
)

path = simulator.simulate(start, max_steps=4, rng=random.Random(7))
```

The simulator is exposed through API endpoints for retrieving valid choices,
applying either a selected or random transition, and generating a bounded
multi-step roll sequence. The interactive frontend uses `POST /rolls/available`
and `POST /rolls/step` for branching, and `POST /rolls/simulate` for 5- or
10-step Auto Rolls that begin at the current authoritative state.

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
POST /rolls/simulate
```

For example, find the shortest path from closed guard bottom to mount top:

```bash
curl -X POST http://127.0.0.1:8000/paths/shortest \
  -H "Content-Type: application/json" \
  -d '{
    "start_state": {
      "position_id": "closed_guard_bottom",
      "mode": "gi",
      "active_controls": [
        {
          "control_id": "wrist_control",
          "owner": "player_a",
          "target": "player_b"
        }
      ]
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
py -m pip install -e .
py -m uvicorn simroll.api.app:app --reload
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

Use the Positions / Grappling map / Pathfinder / Roll simulator switch to move
among the searchable position list, interactive structural graph, path search
form, and step-by-step roll interface.
Position Detail lets users set Gi or No-Gi mode, choose active controls, and inspect
backend-reported transition availability for that state.

Pathfinder accepts a starting position, supported grappling mode, starting controls,
target position, and optional difficulty/type/depth limits. It calls
`POST /paths/shortest` for the shortest valid route or `POST /paths` for multiple
engine-ordered routes. Returned states and owned controls are displayed directly;
the frontend does not execute transitions or reproduce pathfinding rules. Use
**Show on grappling map** on a result to emphasize its returned position and
transition IDs while retaining the rest of the structural map, then **Clear path
highlight** to restore the normal map.

The Roll Simulator setup reuses the shared mode and control selectors. Starting a
roll stores that configuration locally, then asks the backend for valid moves.
**Use Move** sends the selected action ID, while **Surprise Me** sends a null
action ID so the backend chooses one random legal action. Every resulting
position and owned-control set is rendered directly from the returned next state.
The complete Roll History combines manual, Surprise Me, and Auto Roll results in
one timeline and derives visible control additions/releases only by comparing
consecutive returned states. **Auto Roll** calls `POST /rolls/simulate` for 5 or
10 steps, validates the returned path, appends its transition IDs and all states
after the duplicate starting state, and then resumes manual choices from the
backend's final state. **Start New Roll** clears the history and returns to setup
while preserving compatible setup selections.

`VITE_API_BASE_URL` configures the browser-facing API base path and defaults to
`/api`. `VITE_API_PROXY_TARGET` configures the local proxy destination and
defaults to `http://127.0.0.1:8000`. See `frontend/.env.example` for the local
development values; put personal overrides in `frontend/.env.local`.

## Development

Install the development dependencies and run the complete test suite:

```bash
python -m pip install -e ".[dev]"
python -m pytest
python scripts/build_runtime_data.py --check
```
