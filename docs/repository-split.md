# Hara specs repository split

## Target topology

| Repository | Responsibility |
| --- | --- |
| `hara-lang/hara-specs-registry` | Canonical, Git-authoritative specification corpus; immutable package releases; generated registry index; fixtures; signatures and provenance. |
| `hara-lang/hara-specs` | Netlify-deployable registry explorer, package publishing surface, browser checker, API functions, report viewer, and future Hara kernel adapters. |

## Migration sequence

1. Create `hara-lang/hara-specs-registry` from the current `hara-specs` history so specification provenance is retained.
2. Protect its default branch and require registry validation checks for package changes.
3. Keep the Astro application and Netlify configuration in `hara-lang/hara-specs`.
4. Set `HARA_REGISTRY_REPOSITORY=hara-lang/hara-specs-registry` during the service build.
5. Change generated source links and the registry API to the new repository.
6. Remove the transitional specification corpus from the service repository only after the registry deployment is verified.

## Publishing boundary

The first implementation validates package manifests and builds a release bundle locally. A later authenticated endpoint will create a signed pull request in the registry repository. The endpoint must not accept anonymous arbitrary writes through a broad GitHub token; publisher identity, namespace ownership, path restrictions, limits, and signature verification are prerequisites.

## Kernel boundary

The browser and API currently share a small reference checker for the `@hara/spec-package` bootstrap contract. Both return the intended conformance report shape. The Hara WASM and server kernel adapters can replace that evaluator without changing the external contract.
