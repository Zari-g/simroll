# SimRoll — BJJ Domain Model

## Semantic model

SimRoll represents a roll as validated immutable states connected by legal
actions:

```text
Position + mode + stable players + owned controls
    -> legal action
    -> updated state
```

An action is either a positional transition or a same-position control change.

## Position

A position is a canonical graph node with player A and player B roles, mode
legality, terminal status, and allowed/common controls. The runtime contains 20
positions: 19 live positions and the sole dead end, `submission_terminal`.

Gi and No-Gi use the same position graph. Mode changes action and control
legality, not position identity.

## Stable players and roles

`player_a` and `player_b` remain the same people throughout a roll. Top, bottom,
attacker, defender, passer, and guard roles come from the current position and
may change after sweeps or reversals. Controls never change owner merely because
roles change.

## Controls

A control definition describes one of 17 garment, limb, or body controls. An
`ActiveControl` is a concrete immutable instance:

- `control_id`
- `owner` (`player_a` or `player_b`)
- `target` (the other player)

Garment controls are Gi-only. Limb and body controls may be legal in both modes,
subject to the current position and owner-role constraint. Two players can hold
the same control type independently because ownership is part of identity.

The public `/grips` name and flat grip projection fields on transitions are
legacy compatibility surfaces; runtime state uses player-owned controls.

## Actions

A positional `Transition` is one of 65 graph edges, including 10 submissions.
It checks source position, mode, and owned-control requirements, then applies
deterministic removal, creation, preservation, pruning, and destination
validation. A submission edge ends at `submission_terminal` and terminates the
roll.

A `ControlChange` is generated on demand from one of five templates. It acquires,
releases, or switches controls without changing position, mode, or player
identity. Control changes are roll actions but not graph edges; Pathfinder is
intentionally positional-only.

## Simulation and presentation

`RollSimulator` emits ordered states and typed actions with separate positional,
control, and total-event counts. `transition_ids` and `step_count` remain legacy
roll aliases for current consumers; new code uses `actions`, `action_ids`, and
explicit counters.

The frontend covers the complete semantic dataset. Visual coverage remains
intentionally partial: unvisualized positions and unknown choreography use safe,
explicit fallbacks.

Scoring, strategy, stamina, skill levels, probability tuning, control-aware
Pathfinder, and submission physics are outside the completed Iteration 11 model.

## Known future review items

The normalized dataset retains 30 ownership-sensitive review records, 11
manual-review transitions, and future split candidates for the Toreando pass and
old-school sweep. Iteration 11 intentionally does not resolve or remove them.
