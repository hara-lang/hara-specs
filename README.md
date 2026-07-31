# Hara specifications

The specification repository is being reorganised into numbered architectural
layers. Only the language/meta layer is classified in this first pass.

- [`01-language-meta/000-metaspec/draft/hal-metaspec-metaspec.edn`](01-language-meta/000-metaspec/draft/hal-metaspec-metaspec.edn)
   defines the self-describing contract used to lint and verify metaspecs.
- [`01-language-meta/000-metaspec/draft/hal-artifact-metaspec.edn`](01-language-meta/000-metaspec/draft/hal-artifact-metaspec.edn)
   defines the shape of deterministic artifact-format specifications.
- [`01-language-meta/000-metaspec/draft/hal-metaspec.edn`](01-language-meta/000-metaspec/draft/hal-metaspec.edn)
   defines the shape and authority rules for a HAL language specification.
- [`01-language-meta/001-language/draft/hal-langspec.edn`](01-language-meta/001-language/draft/hal-langspec.edn)
   defines the small EDN-oriented HAL data and reader contract.

Each EDN document has an adjacent rendered `README.md` for human readers. The
EDN source remains authoritative.

## Unsorted material

Platform, ecosystem, design, package, CLI, runtime, contribution, and the
previous broad language/runtime documents remain under [`00-unsorted/`](00-unsorted/)
until their numbered homes are settled.

## Language boundary

The active language specification covers data forms, the reader, immutable
values, structural identity, metadata, and canonical readable representations.
Evaluation and runtime behaviour are explicitly outside its scope.

Historical material remains under [`99-archive/`](99-archive/).
