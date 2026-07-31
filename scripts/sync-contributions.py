#!/usr/bin/env python3
"""Copy publishable contribution metadata and specifications into hara-specs."""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path


SPECS_ROOT = Path(__file__).resolve().parents[1]
PUBLISHABLE_NAMES = {"CONTRIBUTION.edn", "README.md"}


def publishable_files(source_root: Path) -> list[Path]:
    if not source_root.is_dir():
        return []
    return sorted(
        path
        for path in source_root.rglob("*")
        if path.is_file()
        and (
            path.name in PUBLISHABLE_NAMES
            or "spec" in path.relative_to(source_root).parts
        )
    )


def sync(source_root: Path, target_root: Path) -> int:
    copied = 0
    for source in publishable_files(source_root):
        relative = source.relative_to(source_root)
        target = target_root / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        copied += 1
    return copied


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "source",
        nargs="?",
        type=Path,
        default=SPECS_ROOT.parent / "contrib",
    )
    parser.add_argument(
        "--target",
        type=Path,
        default=SPECS_ROOT / "00-unsorted" / "contrib",
    )
    args = parser.parse_args()
    copied = sync(args.source.resolve(), args.target.resolve())
    print(f"published {copied} contribution files")


if __name__ == "__main__":
    main()
