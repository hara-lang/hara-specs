# Hara Specifications API

The service exposes a versioned JSON response API alongside the browser interface. Every registry response identifies the exact `hara-lang/hara-specs-registry` commit used by the build.

## Discovery

```text
GET /.well-known/hara-specs
GET /api/v1
GET /api/v1/health
GET /api/v1/capabilities
GET /api/openapi.json
```

Response envelopes include `X-Hara-API-Version`, `X-Hara-Registry-Ref`, and `X-Request-Id`. Cacheable reads support `ETag` and conditional requests.

## Search specifications

```sh
curl 'https://specs.hara-lang.io/api/v1/specs?owner=hara-lang&executable=true&limit=20'
```

Read exact source or documentation bytes through the corresponding specification resource and add `?redirect=true` for an immutable raw GitHub redirect.

## Check `project.edn`

The general check endpoint uses a JSON request envelope because it can carry documents in several notations. The project document itself is EDN:

```sh
curl https://specs.hara-lang.io/api/v1/checks \
  -H 'content-type: application/json' \
  --data '{
    "spec": "hara/package@0.1.0",
    "profile": "core",
    "mediaType": "application/edn",
    "document": "{:hara/type :project :hara/version \"1.0.0\" :project/id greenways/invoice-au :project/version \"1.0.0\" :project/source-paths [\"src\"] :project/test-paths [\"test\"] :project/extension-paths [] :project/capabilities #{}}"
  }'
```

A completed check returns HTTP `200` whether the verdict is `yes` or `no`. Invalid EDN, an unavailable executable checker, or another execution failure is separate from document non-conformity.

## Validate a package project

Send the contributor-authored `project.edn` directly:

```sh
curl https://specs.hara-lang.io/api/v1/packages/validate \
  -H 'content-type: application/edn' \
  --data-binary @project.edn
```

The validator checks project identity, versions, paths, dependencies, package options, build declarations, extensions, capabilities, and digest-pinned remote artifacts. `project.lock.edn` and the `package.edn` inside a `.harp` are generated outputs and are not accepted as publication input.

## Identity boundary

The specifications service does not become the identity or package registry. GitHub establishes contributor and repository identity; accepted specification and package changes remain exact Git records in their canonical registries.
