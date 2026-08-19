"""Generate the canonical Iteration 11A normalized BJJ MVP artifact."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
if str(REPOSITORY_ROOT) not in sys.path:
    sys.path.insert(0, str(REPOSITORY_ROOT))

from simroll.datasets.importer import import_dataset  # noqa: E402


DEFAULT_SOURCE = (
    REPOSITORY_ROOT
    / "data"
    / "curated"
    / "simroll_bjj_mvp_v1"
    / "simroll_bjj_mvp.json"
)
DEFAULT_OUTPUT = (
    REPOSITORY_ROOT
    / "data"
    / "generated"
    / "simroll_bjj_mvp.normalized.json"
)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate and normalize the curated SimRoll BJJ MVP dataset."
    )
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    dataset = import_dataset(args.source, args.output)
    print(
        "Wrote "
        f"{args.output} ({len(dataset.positions)} positions, "
        f"{len(dataset.positional_transitions)} positional transitions, "
        f"{len(dataset.controls)} controls, "
        f"{len(dataset.control_change_templates)} control-change templates)."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
