# HAL chip-base AST matcher

Status: **draft**  
Target version: **0.1.0**

The authoritative contract is
[`hal-chip-base.edn`](hal-chip-base.edn). It conforms to the
[`chip-base meta-spec`](../metaspec/README.md).

## Decision

Chip-base begins as a small AST matching coprocessor, not a HAL evaluator:

> The CPU owns program semantics, memory lifetime, control flow, pattern
> compilation, and rewriting. The symbolic unit receives bounded compact-AST
> jobs and returns a match result plus node-reference bindings.

The first portable operation is:

```clojure
(match pattern expression)
```

For example:

```clojure
pattern     (+ (* ?x 1) 0)
expression  (+ (* a 1) 0)
result      {?x a}
```

Software compiles the pattern into matcher instructions. Hardware never needs
to interpret recursive Lisp pattern syntax.

## Baseline data path

```text
Hara values
    │ encode
    ▼
immutable compact AST arena ───────┐
                                  │
compiled pattern table ───────────┤
                                  ▼
command FIFO → matcher → node cache/memory reader → result FIFO
                    │
                    └── 16 node registers + 8 binding registers
```

Every node is 128 bits:

```text
127       120 119       112 111        96 95          64 63          32 31           0
┌────────────┬─────────────┬─────────────┬──────────────┬──────────────┬──────────────┐
│ tag: 8     │ flags: 8    │ aux: 16     │ child 0: 32  │ child 1: 32  │ payload: 32  │
└────────────┴─────────────┴─────────────┴──────────────┴──────────────┴──────────────┘
```

A node reference is a 32-bit, 16-byte-aligned byte offset from the submitted
arena base. Collection arity is stored in `aux`. The first two children are
inline; remaining children are packed as 32-bit references at the in-arena
tail offset stored in `payload`.

This representation is an accelerator interchange format. It does not require
Hara runtimes to replace their normal object representation.

## Matcher program

The initial instruction set is deliberately small:

```text
LOAD_CHILD
TEST_TAG
TEST_LITERAL
BIND
TEST_BOUND
JUMP
ACCEPT
FAIL
```

Instructions are fixed-width 64-bit words. `N0` starts with the expression
root. A failed test returns `no-match`; malformed input or exhausted execution
budget returns `fault`. Rebinding the same wildcard is equality-checked, so a
pattern such as `(+ ?x ?x)` only matches equal node references. If Hara's
source-level rule requires structural equality between separately allocated
but equal subtrees, software must hash-cons those subtrees during encoding or
keep that rule in software. The baseline does not hide a recursive equality
engine inside `TEST_BOUND`.

Literal tests use a pattern-local constant table. This avoids narrowing the
32-bit integer or interned-symbol payload to make room inside an instruction.
Pattern constants and arena nodes must use the same symbol-ID domain. The first
profile only inlines signed 32-bit integers; rules involving wider HAL integer
literals remain in software.

## Safety and termination

An implementation validates program, constant, node, and child-tail accesses
before reading memory. A job terminates as `match`, `no-match`, or `fault`.
The instruction budget bounds loops and corrupted programs. No-match and fault
results expose no partial bindings.

Input arenas and pattern storage remain immutable while referenced jobs are in
flight. Arena allocation, lifetime, retained results, and garbage collection
remain software responsibilities.

## First implementation profile

The minimum useful FPGA profile has:

- one match context and one instruction issued per cycle at most;
- 16 node-reference registers and 8 binding registers;
- command and result FIFOs;
- a bounded memory reader;
- a 4–16 KiB node cache;
- counters for jobs, instructions, node reads, cache behavior, and stalls;
- MMIO control over shared memory.

The portable contract intentionally does not fix MMIO register addresses,
AXI/TileLink signals, FPGA vendor primitives, HDL, or a CPU instruction
encoding.

RoCC is a possible later Chipyard attachment: it accepts selected custom
instructions, provides source operands and optional destination write-back,
and offers L1 or TileLink-side memory paths. The L1 interface is simpler but
the Chipyard documentation notes that it generally offers less throughput
than a dedicated TileLink connection.

CV-X-IF is another later integration route. It lets an external coprocessor
accept otherwise unsupported instructions and use CPU register operands
without modifying the CPU's internal RTL. Such an integration must also obey
CV-X-IF speculation, commit, and result rules.

## Explicitly deferred

Version 0.1 does not include evaluation, construction, persistent copy-path,
garbage collection, arithmetic, automatic parallel rewriting, hardware
environments, multiple contexts, or custom CPU instructions.

Construction comes next only if matching measurements justify it. The intended
model is an immutable bump-allocated output arena, followed by persistent
copy-path rewriting.

## Demonstrator and acceptance evidence

The reference software model and cycle model should run the normative
[`matcher cases`](conformance/matcher.edn), including successful captures,
repeated wildcard equality, literal mismatch, invalid child access, malformed
programs, and instruction-budget exhaustion.

The first workload should batch simplification candidates such as:

```clojure
(+ ?x 0)        → ?x
(+ 0 ?x)        → ?x
(* ?x 1)        → ?x
(* 1 ?x)        → ?x
(* ?x 0)        → 0
(if true ?a ?b) → ?a
```

Report nodes per second, command overhead, external reads, cache hit rate,
stall cycles, energy where measurable, and the break-even batch size against
the software matcher. Matching throughput alone is not sufficient evidence;
encoding and transfer costs are part of the comparison.

## Informative integration references

- [Chipyard: Adding a RoCC Accelerator](https://chipyard.readthedocs.io/en/stable/Customization/RoCC-Accelerators.html)
- [OpenHW: CORE-V eXtension Interface](https://docs.openhwgroup.org/projects/openhw-group-core-v-xif/en/latest/x_ext.html)
- [RISC-V: RV32I Base Integer Instruction Set](https://docs.riscv.org/reference/isa/v20260120/unpriv/rv32.html)
