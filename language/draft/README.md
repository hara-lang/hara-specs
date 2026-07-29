# HAL language specification

Status: **draft**  
Target version: **1.0.0**

The authoritative document is
[`hal-langspec.edn`](hal-langspec.edn). This README is its human-readable
companion and must not introduce requirements absent from the EDN document.
The document conforms to the draft
[`HAL language specification meta-spec`](../../metaspec/draft/README.md).

## Scope

This specification defines the behaviour of HAL (Hara Lisp), an
EDN-compatible, host-neutral notation and data format, independently of
evaluator, compiler, storage representation, host language, and target
runtime. It covers the reader, values, evaluation, functions and bindings,
collections and iteration, numbers, errors, protocols and structs, namespaces
and modules, portable standard libraries, and the explicit host boundary.

Backend storage, compiler implementation, host reflection, target emission,
editor UX, and extension packaging are outside this language document.

## Portable invariants

- **`:hal/portable-semantics`** — observable meaning is established before a
  target runtime or host language is selected.
- **`:hal/persistent-values`** — literal collections remain persistent unless
  an explicit mutable constructor is used.
- **`:hal/iterator-first`** — sequence operations use HAL's iterator boundary,
  not a host sequence abstraction.
- **`:hal/context-local`** — namespace, Var, macro, protocol, module, and
  capability state belongs to a HAL runtime context.
- **`:hal/no-ambient-authority`** — loading code or an extension grants no
  implicit filesystem, network, process, reflection, or compilation authority.

## Specification sections

1. **Source and reader** — immutable forms, reader literals, prefixes,
   diagnostics, delimiters, and readable round-tripping.
2. **Values and truth** — host-neutral value categories, equality, hashing,
   metadata, and the `nil`/`false` truth rule.
3. **Evaluation** — left-to-right invocation, special evaluation, `do`, and
   tail-position `recur`.
4. **Functions and bindings** — lexical closure, arity, destructuring, and
   parallel `let` initialisation.
5. **Collections and iteration** — persistent updates, collection-family
   preservation, lazy acquisition, and iterator cleanup.
6. **Numbers** — numeric categories, promotion, ratio-free division, and
   arithmetic errors.
7. **Errors and cleanup** — guest values, catches, `finally`, and source
   diagnostics.
8. **Protocols, structs, and multimethods** — context-local dispatch and
   immutable domain values.
9. **Vars, namespaces, macros, and modules** — live Var identity, compile-time
   expansion, and transactional loading.
10. **Standard libraries** — automatically loaded `std.foundation.json` provides JSON read/write formatting;
    `std.pretty` provides canonical readable formatting through `pprint-str`.
11. **Host boundary** — explicit adapters and portable runtime parity.

The authoritative EDN also contains indexed declarations for the core special
forms. Form and requirement identifiers are stable references for conformance
cases and future tooling.

## Executable evidence

- [`conformance/l0.edn`](conformance/l0.edn) — portable evaluation and runtime
  behaviour.
- [`conformance/reader.edn`](conformance/reader.edn) — reader and canonical
  representation.
- [`conformance/parity/jvm-truffle.edn`](conformance/parity/jvm-truffle.edn) —
  JVM interpreter/Truffle parity.
- [`conformance/parity/wasm-truffle.edn`](conformance/parity/wasm-truffle.edn) —
  Rust WebAssembly/Truffle parity.

Coverage is currently partial. Host authority, module rollback, numeric
promotion, iterator closure, error-source behaviour, and standard-library
behaviour still need explicitly linked cases before candidate promotion.
