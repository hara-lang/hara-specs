# HAL chip-base meta-specification

Status: **draft**  
Version: **0.1.0**

[`chip-base-metaspec.edn`](chip-base-metaspec.edn) defines the document shape
for a portable HAL AST matching coprocessor specification.

It requires a chip-base document to define:

- its hardware/software boundary;
- bounded architectural state;
- the compact AST and matcher-program formats;
- commands, results, and deterministic faults;
- portable conformance evidence separately from integration guidance.

The meta-spec does not prescribe an FPGA vendor, HDL, CPU, bus, cache, or
custom-instruction interface.
