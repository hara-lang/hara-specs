# Substrate view proxy

This draft defines a rendering-independent view tree and the request/stream
proxy joining it to page-model services. It specifies validation, declared
action dispatch, state snapshots, causality, and deterministic cleanup.

Normative data is in `substrate-view-proxy.edn`; executable vectors are in
`conformance/view-proxy.edn`.
