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

Iterations 1-3 are complete. SimRoll currently provides validated Pydantic
models and YAML data, a directed graph engine, gi/no-gi transition filtering,
and immutable grappling-state updates. Iteration 4 pathfinding is next.

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

## Tech Stack

- Python
- NetworkX
- Pydantic
- PyYAML
- pytest

FastAPI and React / TypeScript remain possible future layers; they are not part
of the current engine.
