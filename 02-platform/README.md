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
- [`000060-substrate-base`](000060-substrate-base/) — common substrate
  identities, errors, compatibility, and family meta-specification.
- [`000061-substrate-frame`](000061-substrate-frame/) — normalized
  `substrate.v1` frames, kinds, correlation, validation, and JSON encoding.
- [`000062-substrate-node`](000062-substrate-node/) — node identity, spaces,
  registries, dispatch, lifecycle, and ownership.
- [`000063-substrate-service`](000063-substrate-service/) — managed service
  descriptors, dependencies, capabilities, lifecycle, actions, and signals.
- [`000064-substrate-request`](000064-substrate-request/) — handlers,
  promise-normalized invocation, settlement, cancellation, and timeouts.
- [`000065-substrate-stream-router`](000065-substrate-stream-router/) —
  triggers, subscriptions, delivery modes, fan-out, and cleanup.
- [`000066-substrate-transport`](000066-substrate-transport/) — logical
  transport lifecycle and carrier profiles including HTA/1.
- [`000067-substrate-page-model`](000067-substrate-page-model/) — XTalk page,
  group, and model services.
- [`000068-substrate-view-proxy`](000068-substrate-view-proxy/) — portable
  view descriptions and page proxy behavior.
- [`000069-substrate-runtime-profiles`](000069-substrate-runtime-profiles/) —
  Hara/XTalk mappings, implementation gaps, and validation gates.
- [`000100-lsp-base`](000100-lsp-base/) — the portable Language Server
  Protocol profile, shared analysis facts, IDE capabilities, and safety rules.
- [`000200-chip-base`](000200-chip-base/) — the bounded compact-AST matching
  coprocessor contract and its document meta-specification.

Material that has not yet been assigned a numbered platform specification
remains under [`../00-unsorted/`](../00-unsorted/).
