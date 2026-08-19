"""Temporary ownership semantics for the starter transition vocabulary.

The starter graph predates player-owned controls, so its grip lists contain
only IDs. During Iteration 11B those IDs describe controls held by player A
over player B. Later dataset iterations can replace this adapter with
ownership encoded directly in normalized transition data.
"""

from collections.abc import Iterable

from simroll.models import ActiveControl


def starter_control(control_id: str) -> ActiveControl:
    """Return the owned-control form of one legacy starter grip ID."""

    return ActiveControl(
        control_id=control_id,
        owner="player_a",
        target="player_b",
    )


def starter_controls(control_ids: Iterable[str]) -> frozenset[ActiveControl]:
    """Convert legacy starter grip IDs to immutable owned controls."""

    return frozenset(starter_control(control_id) for control_id in control_ids)
