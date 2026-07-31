# Hara substrate nodes and spaces

[`substrate-node.edn`](substrate-node.edn) defines the transport-neutral node
container and named state spaces. A node owns the registries consumed by the
service, request, stream, and transport contracts, but those contracts define
their own behavior.

The portable contract requires isolated state, deterministic listings, atomic
space creation/update, and terminal close semantics.
