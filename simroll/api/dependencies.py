"""Shared dependencies for the SimRoll API."""

from functools import lru_cache

from simroll.engine import GrapplingGraph


@lru_cache(maxsize=1)
def get_graph() -> GrapplingGraph:
    """Return the shared graph built from SimRoll's default data."""

    return GrapplingGraph.from_default_data()
