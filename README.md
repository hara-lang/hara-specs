# Hara specifications

The specification repository is organised around three machine-readable
documents:

- [`metaspec/draft/hal-metaspec.edn`](metaspec/draft/hal-metaspec.edn)
   defines the shape and authority rules for a HAL language specification.
- [`language/draft/hal-langspec.edn`](language/draft/hal-langspec.edn)
   is the first HAL language specification written to that contract.
- [`package/draft/hal-packagespec.edn`](package/draft/hal-packagespec.edn)
   defines Hara package manifests, locked dependency graphs, deterministic
   `.harp` archives, GitHub publication, and verified package loading.

Each EDN document has an adjacent rendered `README.md` for human readers. The
EDN source remains authoritative.

## What the language spec allows

The HAL language spec allows portable Hara programs to:

- read and evaluate HAL forms;
- define functions, lexical bindings, closures, macros, namespaces, and modules;
- work with immutable values and persistent collections;
- use iteration, lazy sequences, numbers, structs, protocols, and multimethods;
- handle errors, cleanup, diagnostics, and tail-position `recur`;
- use portable standard libraries such as JSON and pretty-printing;
- run across different runtimes while preserving the same observable semantics;
- interact with the host environment only through explicit adapters or capabilities.

The spec does not prescribe a specific editor, compiler, storage engine, UI,
filesystem access, network access, or runtime implementation. Those are outside
the portable language contract.

The EDN spec is normative; the README explains it, and the conformance files
provide executable tests for the permitted behavior.

Executable language and parity corpora live with the draft language
specification under [`language/draft/conformance/`](language/draft/conformance/).
The package draft has a non-normative
[`GitHub architecture companion`](package/draft/architecture.md).
Earlier prose, data models, implementation mappings, and product contracts are
preserved as non-normative source material under
[`archive/planning/`](archive/planning/).
