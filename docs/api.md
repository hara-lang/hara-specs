# Hara Specifications API

The service exposes a versioned JSON API alongside the browser interface. Every registry response identifies the exact `hara-lang/hara-specs-registry` commit used by the build.

## Discovery

```text
GET /.well-known/hara-specs
GET /api
GET /api/v1
GET /api/v1/health
GET /api/v1/capabilities
GET /api/openapi.json
```

All JSON responses include:

```text
X-Hara-API-Version: 1
X-Hara-Registry-Ref: <40-character Git commit>
X-Request-Id: <request identifier>
```

Cacheable reads support `ETag` and `If-None-Match`. `GET` resources also support `HEAD`; `OPTIONS` reports the allowed resource methods.

Wildcard cross-origin access is not enabled. A deployment that needs browser clients from another origin must add an explicit, reviewed origin allowlist.

## Search specifications

```sh
curl 'https://specs.hara-lang.io/api/v1/specs?owner=hara-lang&executable=true&limit=20'
```

Supported filters:

- `q`
- `status`
- `layer`
- `owner`
- `classification`
- `materialization`
- `executable=true|false`

Use `sort=title|id|layer|version`, `order=asc|desc`, `limit=1..100`, and the opaque `cursor` returned in `links.next`.

Read a single specification with its URL-safe slug:

```sh
curl https://specs.hara-lang.io/api/v1/specs/hara-identity
```

Retrieve exact source or documentation bytes:

```sh
curl https://specs.hara-lang.io/api/v1/specs/hara-identity/source
curl https://specs.hara-lang.io/api/v1/specs/hara-identity/documentation
```

Add `?redirect=true` to receive a `307` redirect to the immutable raw GitHub URL instead of proxying the representation.

## Check a document

```sh
curl https://specs.hara-lang.io/api/v1/checks \
  -H 'content-type: application/json' \
  --data '{
    "spec": "@hara/spec-package@0.1.0",
    "profile": "core",
    "mediaType": "application/json",
    "document": "{\"name\":\"@greenways/invoice-au\",\"version\":\"1.0.0\",\"kind\":\"hara/spec\",\"entry\":\"spec/main.hal\",\"accepts\":[\"application/json\"],\"description\":\"Invoice rules\",\"license\":\"Apache-2.0\"}"
  }'
```

A completed check returns HTTP `200` whether the verdict is `yes` or `no`. Invalid JSON, an unavailable executable checker, or another execution failure is separate from document non-conformity.

## Validate a package manifest

```sh
curl https://specs.hara-lang.io/api/v1/packages/validate \
  -H 'content-type: application/json' \
  --data @hara.package.json
```

The result identifies the exact registry revision that would receive a future authorized publication.

## Compatibility routes

The original routes remain available:

```text
GET  /api/registry
POST /api/check
POST /api/packages/validate
```

They include a `Deprecation: true` response header and a `Link` header pointing to the version-one successor. There is no removal date yet.

## Identity boundary

The specifications service does not enroll publishers or mutate identity records. Publisher enrollment, namespace ownership, key possession, delegation, authorization, and revocation are external authority concerns currently represented by `hara-lang/hara-identity` and `https://id.hara-lang.org`.
