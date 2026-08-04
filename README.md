# Hara specifications service

`hara-lang/hara-specs` is the Netlify-deployable management and conformance service for `specs.hara-lang.org`.

The canonical specification documents and package releases live in [`hara-lang/hara-specs-registry`](https://github.com/hara-lang/hara-specs-registry). This repository owns the UI, versioned API, publishing workflow, document checker, reports, and browser/server Hara kernel adapters. It does not own or commit a duplicate specification catalogue.

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

## Versioned API

API discovery and the OpenAPI 3.1 description are available at:

```text
GET /.well-known/hara-specs
GET /api
GET /api/v1
GET /api/openapi.json
```

Version one provides:

```text
GET  /api/v1/health
GET  /api/v1/capabilities
GET  /api/v1/specs
GET  /api/v1/specs/:identifier
GET  /api/v1/specs/:identifier/source
GET  /api/v1/specs/:identifier/documentation
POST /api/v1/checks
POST /api/v1/packages/validate
```

Specification listing supports filters, stable sorting, cursor pagination, `HEAD`, CORS, and conditional requests with `ETag`. Source and documentation endpoints either proxy bytes from the exact pinned revision or return an immutable `307` redirect with `?redirect=true`.

The original `/api/registry`, `/api/check`, and `/api/packages/validate` routes remain compatible and advertise their version-one successors. See [`docs/api.md`](docs/api.md) for request and response examples.

## Product surfaces

- Registry explorer and exact-provenance specification pages
- Versioned, discoverable HTTP API with OpenAPI 3.1
- Browser-side and server-side document checking
- Explicit `yes`, `no`, and `execution-error` outcomes
- Package manifest authoring and validation
- Exact source and documentation retrieval
- Future path-scoped, signed pull-request publishing to the registry

## Identity and publishing boundary

The specifications service validates publication material but does not enroll publishers, mint keys, grant namespaces, or write revocations. Those operations belong to the external Hara identity authority currently represented by [`hara-lang/hara-identity`](https://github.com/hara-lang/hara-identity) and `id.hara-lang.org`.

The natural long-term boundary is:

- `hara-id` — identity UI/API, challenge issuance, GitHub enrollment, authorization decisions, and revocation preparation.
- `hara-id-registry` — Git-authoritative root policy, public keys, namespace grants, delegations, validity windows, and append-only revocations.

Direct specification submission remains gated on publisher identity, namespace ownership, immutable-version enforcement, package signatures, conformance fixtures, and path-scoped GitHub credentials. Until those controls are active, the service prepares and validates releases without silently writing canonical registry state.
