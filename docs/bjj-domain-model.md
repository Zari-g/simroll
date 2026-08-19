# SimRoll — BJJ Domain Model

## Overview

SimRoll models Brazilian Jiu-Jitsu as a graph-based system.

A roll is represented as a sequence of connected states.

Positions are nodes.
Transitions are edges.
Grips and rules act as constraints.

---

# Core Entities

## Position

A Position represents a grappling state.

Examples:
- Closed Guard
- Mount
- Side Control
- Back Control
- Turtle
- Standing

Each Position contains:

- id
- name
- category
- dominant_player
- gi_allowed
- no_gi_allowed
- tags
- description

---

## Transition

A Transition represents movement between positions.

Examples:
- Arm Drag
- Knee Cut Pass
- Flower Sweep
- Hip Escape
- Back Take

Each Transition contains:

- id
- name
- from_position
- to_position
- transition_type
- required_grips
- created_grips
- removed_grips
- gi_only
- no_gi_only
- difficulty
- tags
- notes

---

## Grip

A Grip represents physical control points during a roll.

Examples:
- Collar Grip
- Sleeve Grip
- Pant Grip
- Wrist Control
- Underhook
- Overhook

Each Grip contains:

- id
- name
- grip_type
- gi_required
- control_target
- dominant_hand
- tags

---

## Active Control

An Active Control is an immutable control instance attached to stable player
identity. It contains:

- control_id
- owner (`player_a` or `player_b`)
- target (`player_a` or `player_b`)

Owner and target must differ. Player identity remains stable for the entire
roll; top and bottom are positional roles derived from the current position.

## Grappling State

`GrapplingState` is an immutable, hashable snapshot containing:

- position_id
- mode
- active_controls

Two players may hold the same control type independently because ownership is
part of control identity.

---

## Roll State

A Roll State represents the entire simulated exchange.

Each Roll State contains:

- player_one_state
- player_two_state
- current_sequence
- history
- timestamps
- rule_set
- gi_mode

---

# Graph Logic

SimRoll models grappling using directed graphs.

- Positions are nodes
- Transitions are edges
- Pathways are sequences of transitions

The system should support:

- transition lookup
- position connectivity
- pathway discovery
- gi/no-gi filtering
- grip constraints
- branching pathways

---

# Simulation Philosophy

SimRoll is not intended to be a realistic physics engine.

Instead, it focuses on:
- grappling logic
- positional relationships
- transitions
- decision pathways
- playful experimentation

The system should feel educational, interactive, and slightly chaotic — similar to the nature of real BJJ rolls.

