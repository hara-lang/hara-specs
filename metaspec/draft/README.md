# HAL language specification meta-spec

Status: **draft**  
Version: **0.1.0-draft**

The authoritative document is
[`hal-metaspec.edn`](hal-metaspec.edn). This README is its human-readable
companion and must not introduce requirements that are absent from the EDN.

## Purpose

The meta-spec defines the structure and authority rules for machine-readable
HAL language specifications. It standardises:

- document identity, version, and lifecycle status;
- ordered normative sections and stable requirement identifiers;
- special-form, macro, function, and reader-form declarations;
- conformance, parity, implementation, and historical references;
- validation, rendering, and promotion requirements.

## Authority model

The language-spec EDN document is normative. Its rendered README is
informative. Conformance corpora provide executable evidence for named
requirements, while implementation profiles describe backend constraints.
Files below `archive/planning/` are historical input and cannot be normative
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

## Rendering

A conforming renderer writes a companion `README.md` in document order,
includes requirement identifiers, preserves relative links, and labels the
EDN source as authoritative. A stale rendering is a validation failure.

## Promotion

A draft can become a candidate after structural validation, evidence coverage,
current rendering, and active-runtime reporting. A candidate can become stable
only after required conformance and parity pass and semantic ambiguities are
resolved.
