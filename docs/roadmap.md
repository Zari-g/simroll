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

Status:
In progress

---

# Iteration 10 — Transition Animation & Roll Playback

Goal:
Build reusable movement primitives and animated roll simulation playback.

Status:
Future

---

# Iteration 11 — Responsive Web & Touch UX

Goal:
Adapt the desktop simulator for responsive layouts and touch interaction.

Status:
Future

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
