#!/usr/bin/env python3
"""Copy publishable contribution metadata and specifications into hara-specs."""

from __future__ import annotations

import shutil
from pathlib import Path


SPECS_ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = SPECS_ROOT.parent / "contrib"
TARGET_ROOT = SPECS_ROOT / "contrib"
PUBLISHABLE_NAMES = {"CONTRIBUTION.edn", "README.md"}


def publishable_files() -> list[Path]:
    files = [SOURCE_ROOT / "README.md", SOURCE_ROOT / "greenways" / "README.md"]
    for contribution in sorted((SOURCE_ROOT / "greenways").iterdir()):
        if not contribution.is_dir():
            continue
        files.extend(
            path
            for path in contribution.rglob("*")
            if path.is_file()
            and (
                path.name in PUBLISHABLE_NAMES
                or "spec" in path.relative_to(contribution).parts
            )
        )
    return sorted(set(files))


def main() -> None:
    copied = 0
    for source in publishable_files():
        relative = source.relative_to(SOURCE_ROOT)
        target = TARGET_ROOT / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        copied += 1
    print(f"published {copied} contribution files under {TARGET_ROOT.relative_to(SPECS_ROOT)}")


if __name__ == "__main__":
    main()
