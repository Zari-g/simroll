"""Shared dependencies for the SimRoll API."""

from functools import lru_cache

from fastapi import Depends

from simroll.engine import GrapplingGraph, GrapplingPathfinder, RollSimulator


@lru_cache(maxsize=1)
def get_graph() -> GrapplingGraph:
    """Return the shared graph built from SimRoll's default data."""

    return GrapplingGraph.from_default_data()


@lru_cache(maxsize=1)
def get_pathfinder() -> GrapplingPathfinder:
    """Return a pathfinder backed by the shared API graph."""

    return GrapplingPathfinder(get_graph())


def get_simulator(
    graph: GrapplingGraph = Depends(get_graph),
) -> RollSimulator:
    """Return a roll simulator backed by the shared API graph."""

    return RollSimulator(graph)
