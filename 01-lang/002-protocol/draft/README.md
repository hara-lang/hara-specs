# HAL built-in protocols

Status: **draft**

The authoritative document is
[`hal-protocol-spec.edn`](hal-protocol-spec.edn). It conforms to the
[`HAL protocol meta-spec`](../metaspec/README.md).

This layer owns `std.protocol.*`: 53 canonical protocol descriptors, their
method Vars, arities, inheritance, built-in dispatch, guest extension, and
failure categories.

It does not own Foundation wrapper functions, native methods, struct
construction, or multimethod semantics. Those boundaries prevent a protocol
method such as `ICount/count`, the root wrapper `std.foundation/count`, and a
runtime implementation from becoming competing authorities.

Legacy protocol catalogs remain migration evidence until adjacent executable
corpora are generated for this layer.
