# Hara package specification

Status: **draft**
Target version: **0.1.0**

The authoritative document is
[`hal-packagespec.edn`](hal-packagespec.edn). This README is its informative
companion and adds no requirements.

## Purpose

Hara packages are reproducible `.harp` archives. A project declares SemVer
intent in its existing flat `project.edn`; `project.lock.edn` records the exact
Git registry, identity-policy, source, release-asset, and digest choices.

```text
project.edn -> hara package sync -> project.lock.edn
                                   -> verified .harp cache -> read-only roots
```

`require` only reads those mounted roots. It never downloads packages.

## Commands

Package features are part of the bundled `hara` CLI:

```shell
hara package add hara/graph@^1.2.0
hara package sync --frozen
hara package build
hara package inspect graph-1.2.3.harp
```

`hara-compiler` and project IR-to-machine-code compilation are deliberately
outside version one.

## Trust and publication

The reviewed registry is `github:hara-lang/hara-packages`; package archives
are primary GitHub Release assets on their source repositories. A package is
verified only when both of these detached Ed25519 signatures validate against
the locked revision of `github:hara-lang/hara-identity`:

1. the publisher release intent for the coordinate, version, repository ID,
   tag, and commit;
2. the registry-CI attestation for those fields and the final archive digest.

`hara-identity` contains public keys, delegation, validity, revocation, and
CODEOWNERS-governed policy only. Private signing keys never enter Git.

## Archives and browser hosts

Archives have deterministic ZIP-compatible layout, generated `package.edn`,
and a tree digest. HAL, HIR, resources, extension descriptors, WASM, and HTA
assets are verified before mounting. Browser hosts perform resolution and
digest-addressed caching before starting the WASM runtime; the evaluator itself
has no package-network authority.

See the non-normative [GitHub architecture](architecture.md) for the registry
CI and service layout.
