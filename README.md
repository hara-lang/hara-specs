# Hara specifications

The specification repository is organised around two machine-readable
documents:

1. [`metaspec/draft/hal-metaspec.edn`](metaspec/draft/hal-metaspec.edn)
   defines the shape and authority rules for a HAL language specification.
2. [`language/draft/hal-langspec.edn`](language/draft/hal-langspec.edn)
   is the first HAL language specification written to that contract.

Each EDN document has an adjacent rendered `README.md` for human readers. The
EDN source remains authoritative.

Executable language and parity corpora live with the draft language
specification under [`language/draft/conformance/`](language/draft/conformance/).
Earlier prose, data models, implementation mappings, and product contracts are
preserved as non-normative source material under
[`archive/planning/`](archive/planning/).
