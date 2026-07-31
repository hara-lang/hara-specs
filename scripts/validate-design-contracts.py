#!/usr/bin/env python3
"""Parse the design contracts as EDN and cross-check their primitive references."""
from pathlib import Path
import re
import json
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
THEME = ROOT / "00-unsorted/design/draft/theme.edn"
LANGUAGE = ROOT / "00-unsorted/design/draft/design-language.edn"

def parse_edn(path: Path) -> None:
    source = json.dumps(path.as_posix())
    subprocess.run(["bb", "-e", f"(do (clojure.edn/read-string (slurp {source})) nil)"], check=True)

def keywords_after(source: str, key: str) -> set[str]:
    match = re.search(re.escape(key) + r"\s*#\{([^}]*)\}", source, re.S)
    if not match:
        raise ValueError(f"Missing set for {key}")
    return set(re.findall(r":[\w-]+", match.group(1)))

def main() -> None:
    for path in (THEME, LANGUAGE):
        parse_edn(path)
        print(f"valid EDN: {path.relative_to(ROOT)}")
    primitives = keywords_after(THEME.read_text(), ":theme/primitives")
    used = keywords_after(LANGUAGE.read_text(), ":design/theme-primitives")
    missing = sorted(used - primitives)
    if missing:
        raise SystemExit(f"design language references unknown theme primitives: {', '.join(missing)}")
    print(f"primitive references valid: {len(used)}")

if __name__ == "__main__":
    main()
