# Hara specifications

The specification repository is organised into numbered architectural layers.

- [`01-lang/000-metaspec/draft/metaspec-metaspec.edn`](01-lang/000-metaspec/draft/metaspec-metaspec.edn)
   defines the self-describing contract used to lint and verify metaspecs.
- [`01-lang/001-language/metaspec/language-metaspec.edn`](01-lang/001-language/metaspec/language-metaspec.edn)
   defines the shape and authority rules for a HAL language specification.
- [`01-lang/001-language/draft/hal-langspec.edn`](01-lang/001-language/draft/hal-langspec.edn)
   defines the small EDN-oriented HAL data and reader contract.
- [`01-lang/002-protocol/draft/protocol-spec.edn`](01-lang/002-protocol/draft/protocol-spec.edn)
   defines the built-in `std.protocol.*` descriptors and dispatch contract.
- [`01-lang/003-native/draft/native-spec.edn`](01-lang/003-native/draft/native-spec.edn)
   defines the explicit `std.native.*` runtime boundary.
- [`01-lang/004-foundation/draft/foundation-spec.edn`](01-lang/004-foundation/draft/foundation-spec.edn)
   defines the root `std.foundation` bootstrap namespace.
- [`01-lang/005-foundation-annex/draft/foundation-annex.edn`](01-lang/005-foundation-annex/draft/foundation-annex.edn)
   defines the public `std.foundation.*` library annex.
- [`01-lang/006-host-and-kernel/draft/host-kernel-spec.edn`](01-lang/006-host-and-kernel/draft/host-kernel-spec.edn)
   defines the host/kernel authority boundary: sessions, grants, provider
   dispatch, settlement, and the ownership map to the surrounding layers.
- [`02-platform/000100-lsp-base/draft/hara-lsp-base.edn`](02-platform/000100-lsp-base/draft/hara-lsp-base.edn)
   defines the portable Language Server Protocol profile, shared analysis
   facts, namespace resolution, IDE capabilities, and safety boundary.
- [`02-platform/000001-cli/metaspec/cli-app-metaspec.edn`](02-platform/000001-cli/metaspec/cli-app-metaspec.edn)
   defines the reusable document model for deterministic CLI applications.
- [`02-platform/000001-cli/draft/hara-cli.edn`](02-platform/000001-cli/draft/hara-cli.edn)
   defines Hara's public command-line routes, options, handlers, and outcomes.
- [`02-platform/000002-tap/draft/hara-tap.edn`](02-platform/000002-tap/draft/hara-tap.edn)
   begins the Git-authoritative federated tap family.
- [`02-platform/`](02-platform/)
   contains the numbered identity, artifact, HARP, package, extension, asset,
   publishing, distribution, and mirroring protocols.
- [`02-platform/000050-transport-hta/draft/transport-hta.edn`](02-platform/000050-transport-hta/draft/transport-hta.edn)
   defines the Hara transport ABI extension boundary.
- [`02-platform/000051-transport-resp/draft/transport-resp.edn`](02-platform/000051-transport-resp/draft/transport-resp.edn)
   defines the RESP evaluation-broker transport.
- [`02-platform/000060-substrate-base/draft/substrate-base.edn`](02-platform/000060-substrate-base/draft/substrate-base.edn)
   begins the source-faithful specification of Foundation Base's
   `xt.substrate` library.
- [`02-platform/000069-substrate-runtime-profiles/draft/substrate-runtime-profiles.edn`](02-platform/000069-substrate-runtime-profiles/draft/substrate-runtime-profiles.edn)
   records the generated runtime coverage declared by the pinned XTalk tests.

Each EDN document has an adjacent rendered `README.md` for human readers. The
EDN source remains authoritative.

## Unsorted material

Unclassified platform, ecosystem, design, package, runtime, contribution, and
the previous broad language/runtime documents remain under
[`00-unsorted/`](00-unsorted/) until their numbered homes are settled.

## Language boundary

The active language specification covers data forms, the reader, immutable
values, structural identity, metadata, and canonical readable representations.
Evaluation and runtime behaviour are explicitly outside its scope.

Historical material remains under [`99-archive/`](99-archive/).

## Registry service

This repository now also contains the Netlify-deployable `specs.hara-lang.io` application. It uses `@hara-lang/visual-language` and provides the registry explorer, package publishing preparation, a browser conformity workbench, and matching Netlify API endpoints.

The target split is:

- `hara-lang/hara-specs-registry` — canonical specification packages and generated index.
- `hara-lang/hara-specs` — the UI, API, package-management surface, and Hara kernel adapters.

The current corpus remains in this repository during the transition so its history and existing explorer are not disrupted. See [`docs/repository-split.md`](docs/repository-split.md).

### Local service

```sh
npm install
npm run dev
```

### Validation

```sh
npm test
npm run build
```

The initial reference checker implements the bootstrap `@hara/spec-package@0.1.0` manifest contract. It intentionally reports malformed input and unsupported media types as execution errors rather than as failed conformity decisions.
