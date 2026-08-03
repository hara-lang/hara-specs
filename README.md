# Hara specifications service

`hara-lang/hara-specs` is the Netlify-deployable management and conformance service for `specs.hara-lang.io`.

The canonical specification documents and package releases live in [`hara-lang/hara-specs-registry`](https://github.com/hara-lang/hara-specs-registry). This repository owns the UI, API, publishing workflow, document checker, reports, and browser/server Hara kernel adapters. It does not own or commit a duplicate specification catalogue.

## Registry source

Before development or production builds, the service resolves the configured registry ref to an exact Git commit, downloads `registry-index.json` from that revision, validates the catalogue, and generates:

```text
src/generated/registry.json
public/registry/index.json
```

Both files are untracked build outputs. Source and documentation links use per-spec repository, exact ref, and path metadata, so every rendered result identifies the immutable specification revision it used.

Configuration:

```text
HARA_REGISTRY_REPOSITORY=hara-lang/hara-specs-registry
HARA_REGISTRY_REF=main
HARA_REGISTRY_INDEX_PATH=registry-index.json
```

`HARA_GITHUB_TOKEN` is optional for public registry builds and is supplied by GitHub Actions to avoid unauthenticated API limits. Development, CI, and Netlify builds fail closed when the canonical registry cannot be resolved or validated; the service never falls back to stale committed registry data.

For a fully reproducible release build, set `HARA_REGISTRY_REF` to an exact 40-character commit SHA. Branch names such as `main` are resolved and pinned before Astro generates pages or Netlify bundles the API functions.

## Development

```sh
npm install
npm test
npm run dev
npm run build
```

Useful registry commands:

```sh
npm run registry:build
npm run registry:check
```

## Product surfaces

- Registry explorer and exact-provenance specification pages
- Browser-side and server-side document checking
- Explicit `yes`, `no`, and `execution-error` outcomes
- Package manifest authoring and validation
- Netlify registry, check, and package-validation APIs
- Future path-scoped, signed pull-request publishing to the registry

## Publishing boundary

The registry repository is provisioned and validated. Direct submission remains gated on publisher identity, namespace ownership, immutable-version enforcement, package signatures, conformance fixtures, and path-scoped GitHub credentials. Until those controls are active, the service prepares and validates releases without silently writing canonical registry state.
