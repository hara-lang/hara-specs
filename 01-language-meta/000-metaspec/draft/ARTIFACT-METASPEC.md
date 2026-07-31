# HAL Artifact DSL Meta-Specification

Status: draft, version 0.1.0.

The artifact meta-spec conforms to the self-describing normative
[`hal-metaspec-metaspec.edn`](hal-metaspec-metaspec.edn). The normative
artifact document is
[`hal-artifact-metaspec.edn`](hal-artifact-metaspec.edn). This Markdown file is
an informative guide.

An artifact specification is a sibling of the HAL language specification. It
does not change HAL syntax. It declares an artifact kind, its five specification
surfaces (`forms`, `entities`, `relations`, `codecs`, and `checkers`), semantic
laws, and data-driven conformance resources.

Every schema, requirement, law, relation, checker and conformance case has a
stable qualified identifier. Extensions may add keys, but extension keys must
be qualified. References between declarations are validated by identifier.

The common obligation statuses are `pass`, `fail`, `unknown`, `blocked`,
`waived`, and `not-applicable`. In particular, `unknown` is information rather
than success and must remain visible to downstream policy.

Artifact DSL implementations follow a data boundary:

```text
source → HAL forms with spans → surface model → canonical model
       → canonical EDN → obligations and findings
```

Canonical models contain only portable HAL/EDN values. Formatting, comments,
whitespace, runtime values and host handles are outside semantic equality.

## AI generation loop

An agent starts with a machine-readable generation request, emits a draft EDN
meta-spec, and runs the linter. Each finding carries a stable rule and
requirement ID, a data path, and a structured repair action. After lint reaches
closure, verification resolves all schema and declared cross-references. Only a
report with no failed, unknown, or blocked obligations is accepted as a
generated meta-spec.

The offline bootstrap workflow is:

```text
hara spec template
hara spec lint generated-metaspec.edn --format edn
hara spec verify generated-metaspec.edn --format edn
```

`lint` checks document shape, qualified keys, stable IDs and uniqueness.
`verify` adds schema-reference, cross-reference and `conforms-to` resolution.
Exit status is 0 for a passing report, 1 for a valid document with findings,
and 2 for unreadable input or invalid command usage.
