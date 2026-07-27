#!/usr/bin/env python3
"""Write the deterministic file manifest consumed by the static specs explorer."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "spec-manifest.json"
EXTENSIONS = {".edn": "edn", ".json": "json", ".md": "markdown"}
EXCLUDED = {"spec-manifest.json"}


def files() -> list[dict[str, str]]:
    tracked = subprocess.check_output(
        ["git", "ls-files"], cwd=ROOT, text=True
    ).splitlines()
    entries = []
    for path in tracked:
        if path in EXCLUDED:
            continue
        kind = EXTENSIONS.get(Path(path).suffix.lower())
        if kind is None:
            continue
        entries.append({"path": path, "kind": kind})
    return sorted(entries, key=lambda entry: entry["path"])


def main() -> None:
    payload = {"version": 1, "files": files()}
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {len(payload['files'])} files to {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
