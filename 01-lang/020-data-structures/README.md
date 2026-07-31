# 020 — Data structures

Normative specification for the Hara persistent data structures: structure
catalog, op and iteration-order semantics, transient behaviour, and the
cross-runtime hashing contract.

- [`draft/`](draft/) — current draft (`data-structures-spec.edn`) with
  machine-checked conformance corpora under `draft/conformance/`. The corpora
  regenerate from the Java reference runtime; see the
  [draft README](draft/README.md#executable-evidence) for the exact commands
  and caveats (generators live in untracked `target/hashdump/`, and
  `java/target/classes` must be rebuilt first because the `Queue` repairs are
  uncommitted).
- `metaspec/` — **TODO**: the document-model metaspec for this area has not
  been written yet. The draft declares conformance to
  `:hara/data-structures-metaspec` as `:planned`; add the metaspec here when
  the area stabilises (see `01-lang/002-protocol/metaspec/` for the pattern).
