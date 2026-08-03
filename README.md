# Hara specifications service

`hara-lang/hara-specs` is the Netlify-deployable management and conformance service for `specs.hara-lang.io`.

The canonical specification documents and package releases live in [`hara-lang/hara-specs-registry`](https://github.com/hara-lang/hara-specs-registry). This repository owns the UI, API, publishing workflow, document checker, reports, and browser/server Hara kernel adapters. It no longer owns a duplicated numbered specification corpus.

## Registry source

Every build resolves the configured registry ref to an exact Git commit, downloads `registry-index.json` at that commit, validates the catalogue, and writes the build snapshot to:

```text
src/generated/registry.mjs
public/registry/index.json
```

Source and documentation links use per-spec repository, exact ref, and path metadata. A spec may therefore be fully materialized in the registry or temporarily address an immutable migration origin without the service confusing the two.

Configuration:

```text
HARA_REGISTRY_REPOSITORY=hara-lang/hara-specs-registry
HARA_REGISTRY_REF=main
HARA_REGISTRY_INDEX_PATH=registry-index.json
HARA_REGISTRY_REQUIRED=true
```

`HARA_GITHUB_TOKEN` is optional for public registry builds and is supplied by GitHub Actions to avoid unauthenticated API limits. Netlify builds fail closed when the required external registry cannot be resolved. Local development may use the committed exact-ref snapshot when offline.

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
