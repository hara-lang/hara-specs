# HALC conformance corpus

This directory is the runtime-neutral acceptance surface for HALC. Java and Rust consume the same manifests and golden files; runtime-local copies are not authoritative.

`values.edn` defines portable form cases. `invalid-artifacts.edn` defines deterministic mutations and required rejection categories. Binary goldens are generated only by a successful cross-runtime interoperability run:

```text
golden/complete.halc   canonical HALC v1 emitted identically by Java and Rust
golden/legacy-v1.hir   frozen former HIR v1 accepted only by compatibility readers
```

The generator builds the complete module from `values.edn`, encodes it independently with Java and Rust, fails unless the bytes match, verifies cross-runtime decode and evaluation, writes `complete.halc`, and copies the frozen pre-HALC fixture as `legacy-v1.hir`.

Goldens must not be hand-edited. A wire-format change requires a format-version decision, updated manifests, regeneration by both implementations, and review of the binary diff.

Invalid cases use mutation operations rather than large embedded byte arrays. Operations apply in order to the named base artifact. Unless a case explicitly recomputes the checksum, payload corruption retains the old checksum.
