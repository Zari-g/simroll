"""State-aware breadth-first pathfinding for the grappling graph."""

from collections import deque
from collections.abc import Collection

from simroll.engine.graph import GrapplingGraph
from simroll.models import GrapplingPath, GrapplingState, Transition


class GrapplingPathfinder:
    """Find grappling paths while tracking complete immutable states."""

    def __init__(self, graph: GrapplingGraph) -> None:
        self._graph = graph

    def find_shortest_path(
        self,
        start_state: GrapplingState,
        target_position_id: str,
        *,
        difficulties: Collection[str] | None = None,
        transition_types: Collection[str] | None = None,
        max_depth: int | None = None,
    ) -> GrapplingPath | None:
        """Return the shortest valid path to a position, if one exists."""

        self._validate_max_depth(max_depth)
        self._validate_endpoints(start_state, target_position_id)
        start_path = GrapplingPath(states=(start_state,))

        if start_state.position_id == target_position_id:
            return start_path

        difficulty_filter = self._normalize_filter(difficulties)
        type_filter = self._normalize_filter(transition_types)
        queue: deque[GrapplingPath] = deque([start_path])
        visited = {start_state}

        while queue:
            path = queue.popleft()
            if max_depth is not None and path.step_count >= max_depth:
                continue

            for transition in self._matching_transitions(
                path.final_state,
                difficulty_filter,
                type_filter,
            ):
                next_state = self._graph.apply_transition(
                    path.final_state, transition.id
                )
                if next_state in visited:
                    continue

                visited.add(next_state)
                next_path = self._extend_path(path, transition, next_state)
                if next_state.position_id == target_position_id:
                    return next_path
                queue.append(next_path)

        return None

    def find_paths(
        self,
        start_state: GrapplingState,
        target_position_id: str,
        *,
        difficulties: Collection[str] | None = None,
        transition_types: Collection[str] | None = None,
        max_paths: int = 10,
        max_depth: int = 10,
    ) -> list[GrapplingPath]:
        """Return valid paths in nondecreasing step-count order."""

        if max_paths <= 0:
            raise ValueError("max_paths must be greater than zero.")
        self._validate_max_depth(max_depth)
        self._validate_endpoints(start_state, target_position_id)
        start_path = GrapplingPath(states=(start_state,))

        if start_state.position_id == target_position_id:
            return [start_path]

        difficulty_filter = self._normalize_filter(difficulties)
        type_filter = self._normalize_filter(transition_types)
        queue: deque[tuple[GrapplingPath, frozenset[GrapplingState]]] = deque(
            [(start_path, frozenset({start_state}))]
        )
        results: list[GrapplingPath] = []
        result_sequences: set[tuple[str, ...]] = set()

        while queue and len(results) < max_paths:
            path, path_states = queue.popleft()
            if path.step_count >= max_depth:
                continue

            for transition in self._matching_transitions(
                path.final_state,
                difficulty_filter,
                type_filter,
            ):
                next_state = self._graph.apply_transition(
                    path.final_state, transition.id
                )
                if next_state in path_states:
                    continue

                next_path = self._extend_path(path, transition, next_state)
                if next_state.position_id == target_position_id:
                    if next_path.transition_ids not in result_sequences:
                        result_sequences.add(next_path.transition_ids)
                        results.append(next_path)
                        if len(results) == max_paths:
                            break
                    continue

                queue.append((next_path, path_states.union({next_state})))

        return results

    def _validate_endpoints(
        self,
        start_state: GrapplingState,
        target_position_id: str,
    ) -> None:
        self._graph.validate_state(start_state)
        self._graph.get_position(target_position_id)

    @staticmethod
    def _validate_max_depth(max_depth: int | None) -> None:
        if max_depth is not None and max_depth < 0:
            raise ValueError("max_depth must be zero or greater.")

    @staticmethod
    def _normalize_filter(
        values: Collection[str] | None,
    ) -> frozenset[str] | None:
        if values is None:
            return None
        return frozenset(values)

    def _matching_transitions(
        self,
        state: GrapplingState,
        difficulties: Collection[str] | None,
        transition_types: Collection[str] | None,
    ) -> list[Transition]:
        transitions = self._graph.get_available_transitions(
            state.position_id,
            state.mode,
            state.active_controls,
        )
        return sorted(
            (
                transition
                for transition in transitions
                if self._matches_filters(
                    transition, difficulties, transition_types
                )
            ),
            key=lambda transition: transition.id,
        )

    @staticmethod
    def _matches_filters(
        transition: Transition,
        difficulties: Collection[str] | None,
        transition_types: Collection[str] | None,
    ) -> bool:
        return (
            difficulties is None or transition.difficulty in difficulties
        ) and (
            transition_types is None
            or transition.transition_type in transition_types
        )

    @staticmethod
    def _extend_path(
        path: GrapplingPath,
        transition: Transition,
        next_state: GrapplingState,
    ) -> GrapplingPath:
        return GrapplingPath(
            states=path.states + (next_state,),
            transition_ids=path.transition_ids + (transition.id,),
        )
