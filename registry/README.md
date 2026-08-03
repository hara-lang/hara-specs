# Hara specification registry contract

This directory is the bootstrap contract for the future `hara-lang/hara-specs-registry` repository. The target registry stores immutable specification packages, generated indexes, fixtures, publisher signatures, and release metadata. The Netlify application in `hara-lang/hara-specs` consumes the generated index but does not own the canonical specification source.

A specification package starts with `hara.package.json` and declares one of these package kinds:

- `hara/spec`
- `hara/profile`
- `hara/rules`
- `hara/adapter`
- `hara/dataset`

The JSON Schema in `hara-spec-package.schema.json` is the portable bootstrap validator. The normative Hara implementation will live in a signed `@hara/spec-package` package and execute through the Hara kernel.
