import pytest
from pydantic import ValidationError

from simroll.models import GrapplingPath, GrapplingState


def test_zero_step_path_is_valid() -> None:
    state = GrapplingState(position_id="start", mode="gi")

    path = GrapplingPath(states=(state,), transition_ids=())

    assert path.start_state == state
    assert path.final_state == state
    assert path.step_count == 0


def test_multi_step_path_exposes_states_and_step_count() -> None:
    start = GrapplingState(position_id="start", mode="gi")
    middle = GrapplingState(position_id="middle", mode="gi")
    final = GrapplingState(position_id="target", mode="gi")

    path = GrapplingPath(
        states=(start, middle, final),
        transition_ids=("first", "second"),
    )

    assert path.states == (start, middle, final)
    assert path.start_state == start
    assert path.final_state == final
    assert path.step_count == 2


@pytest.mark.parametrize(
    ("states", "transition_ids"),
    [
        (
            (GrapplingState(position_id="start", mode="gi"),),
            ("unexpected",),
        ),
        (
            (
                GrapplingState(position_id="start", mode="gi"),
                GrapplingState(position_id="target", mode="gi"),
            ),
            (),
        ),
    ],
)
def test_path_rejects_misaligned_state_and_transition_counts(
    states: tuple[GrapplingState, ...],
    transition_ids: tuple[str, ...],
) -> None:
    with pytest.raises(
        ValidationError,
        match="exactly one more state than transition IDs",
    ):
        GrapplingPath(states=states, transition_ids=transition_ids)


def test_path_requires_at_least_one_state() -> None:
    with pytest.raises(ValidationError, match="at least 1 item"):
        GrapplingPath(states=(), transition_ids=())


def test_path_is_immutable() -> None:
    state = GrapplingState(position_id="start", mode="gi")
    path = GrapplingPath(states=(state,))

    with pytest.raises(ValidationError, match="Instance is frozen"):
        path.transition_ids = ("changed",)

    assert path.transition_ids == ()
