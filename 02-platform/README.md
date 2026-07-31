# Hara platform specifications

Platform specifications define host-facing contracts above the core HAL data
and reader layer. They cover executable tools, runtime services, packaging, and
other interfaces that must remain portable across supported Hara runtimes.

## Specifications

- [`000001-cli`](000001-cli/) — deterministic command-line applications,
  routing, options, handlers, outcomes, and the public Hara CLI contract.
- [`000050-transport-hta`](000050-transport-hta/) — the Hara transport ABI
  extension boundary.
- [`000051-transport-resp`](000051-transport-resp/) — the RESP
  evaluation-broker transport.
- [`000060-substrate-base`](000060-substrate-base/) — source authority,
  namespace topology, and fidelity rules for the existing `xt.substrate`.
- [`000061-substrate-frame`](000061-substrate-frame/) — XTalk NodeFrame
  constructors, five frame kinds, validation, normalization, and JSON.
- [`000062-substrate-node`](000062-substrate-node/) — mutable EventNode and
  NodeSpace records, construction, configuration, and state operations.
- [`000063-substrate-service`](000063-substrate-service/) — the arbitrary-value
  EventNode service registry and built-in utility handlers.
- [`000064-substrate-request`](000064-substrate-request/) — handlers,
  promise normalization, pending entries, routing, and settlement.
- [`000065-substrate-stream-router`](000065-substrate-stream-router/) —
  XTalk triggers, router maps, subscriptions, control frames, and fan-out.
- [`000066-substrate-transport`](000066-substrate-transport/) — NodeTransport
  plus memory, browser, worker, MessagePort, and WebSocket adapters.
- [`000067-substrate-page-model`](000067-substrate-page-model/) — the XTalk
  per-space page runtime, model pipelines, dependencies, and throttling.
- [`000068-substrate-view-proxy`](000068-substrate-view-proxy/) — the exact
  XTalk view IR, catalog, subscriptions, demos, and page proxy.
- [`000069-substrate-runtime-profiles`](000069-substrate-runtime-profiles/) —
  generated-runtime coverage reported by the pinned XTalk tests.
- [`000100-lsp-base`](000100-lsp-base/) — the portable Language Server
  Protocol profile, shared analysis facts, IDE capabilities, and safety rules.
- [`000200-chip-base`](000200-chip-base/) — the bounded compact-AST matching
  coprocessor contract and its document meta-specification.

Material that has not yet been assigned a numbered platform specification
remains under [`../00-unsorted/`](../00-unsorted/).
