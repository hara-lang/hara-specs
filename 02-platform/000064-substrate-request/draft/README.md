# Substrate request

This draft defines the portable request/response layer above substrate frames.
It makes promise normalization, exactly-once settlement, cancellation, timeout,
and shutdown behavior observable across Hara and XTalk implementations.

Normative data is in `substrate-request.edn`; executable vectors are in
`conformance/request.edn`.
