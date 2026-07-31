# HAL bytecode VM runtime specification

Status: **draft**  
Target version: **0.3.0**

The authoritative document is
[`hal-bytecode-vm.edn`](hal-bytecode-vm.edn). This README is its human-readable
companion and must not introduce requirements absent from the EDN document.

## Scope

This specification defines the experimental, staged bytecode VM for the Rust
runtime (issues #195/#202), behind the non-default `bytecode-vm` Cargo
feature:

- the parse → compile → validate → execute pipeline for a synchronous
  operand-stack machine;
- the typed instruction set, program and function representation, and the
  validation rules every program must pass before execution;
- lexical slot allocation and `loop`/`recur` lowering;
- function values, by-value captures as prefixed slots, direct and static
  calls, and `defn` lowering to direct bindings;
- the declare-or-error rule for replacing std.foundation builtins through
  `defn`;
- coexistence with the tree-walking evaluator: the VM never replaces it and
  never falls back to it.

It does not define exceptions, suspension, namespaces, or var semantics;
those are future milestones (#203, #204).

## Executable evidence

[`conformance/bytecode-vm.edn`](conformance/bytecode-vm.edn) is the
machine-checked corpus, consumed by `rust/src/vm/conformance_tests.rs`.
`:display` and `:error-category` cases must agree on both evaluators;
`:compile-error` and `:vm-display` cases pin VM-canonical behavior the tree
evaluator converges to later.
