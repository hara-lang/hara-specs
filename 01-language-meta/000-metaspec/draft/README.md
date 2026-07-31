# Hara meta-specifications

Status: **draft**  
Version: **0.1.0-draft**

The authoritative documents are:

- [`hal-metaspec-metaspec.edn`](hal-metaspec-metaspec.edn), the
  self-describing contract for metaspec documents and agent repair reports;
- [`hal-metaspec.edn`](hal-metaspec.edn), the shape of HAL language
  specifications;
- [`hal-artifact-metaspec.edn`](hal-artifact-metaspec.edn), the sibling
  contract for deterministic artifact-format specifications.

This README is an informative companion and must not introduce requirements
that are absent from those EDN documents.

## Purpose

The meta-meta-spec lets an AI agent generate a metaspec, lint it, apply
structured repairs, and verify it without network access. The language
meta-spec then defines the structure and authority rules for machine-readable
HAL language specifications. Together they standardise:

- document identity, version, and lifecycle status;
- ordered normative sections and stable requirement identifiers;
- special-form, macro, function, and reader-form declarations;
- conformance, parity, implementation, and historical references;
- validation, rendering, and promotion requirements.

The artifact meta-spec is deliberately separate: it describes domain formats
without expanding or weakening the HAL language contract.

## Authority model

The language-spec EDN document is normative. Its rendered README is
informative. Conformance corpora provide executable evidence for named
requirements, while implementation profiles describe backend constraints.
Files below `99-archive/planning/` are historical input and cannot be normative
dependencies of an active specification.

## Required language-spec structure

A conforming document declares:

1. identity, type, version, status, title, and summary;
2. the meta-spec document and version it conforms to;
3. scope and portable invariants;
4. an explicit section order and the corresponding sections;
5. its language forms;
6. typed references and conformance suites;
7. coverage and provenance where applicable.

Normative requirements carry stable qualified identifiers and one of
`:must`, `:must-not`, `:should`, `:should-not`, or `:may`.

## Validation

Validation checks identifier uniqueness, cross-reference integrity, section
ordering, requirement evidence, authority boundaries, and repository-local
paths. Unknown extension keys must be qualified.

The local workflow is:

```text
hara spec template
hara spec lint FILE --format edn
hara spec verify FILE --format edn
hara spec validate ARTIFACT_SPEC --against ARTIFACT_METASPEC --format edn
```

Reports use stable finding IDs, data paths, and machine-readable repair
actions. A report cannot pass with failed, unknown, or blocked obligations.

## Rendering

A conforming renderer writes a companion `README.md` in document order,
includes requirement identifiers, preserves relative links, and labels the
EDN source as authoritative. A stale rendering is a validation failure.

## Promotion

A draft can become a candidate after structural validation, evidence coverage,
current rendering, and active-runtime reporting. A candidate can become stable
only after required conformance and parity pass and semantic ambiguities are
resolved.
