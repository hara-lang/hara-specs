# Hara substrate managed services

[`substrate-service.edn`](substrate-service.edn) defines the shared Hara/XTalk
service model. Portable descriptors declare identity, dependencies,
capabilities, actions, and signals. Runtime instances and lifecycle callbacks
remain local to their node.

Managed services start in stable dependency order and stop in reverse order.
The existing Hara `IService` and XTalk `set-service` registries remain
compatible through an explicit legacy profile: arbitrary values are implicit
running services without lifecycle or remotely callable declarations.
