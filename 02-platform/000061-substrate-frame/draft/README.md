# Hara substrate frames

The authoritative [`substrate-frame.edn`](substrate-frame.edn) contract defines
the `substrate.v1` logical frame shared by requests, responses, streams,
subscriptions, cancellation, and errors.

Canonical frames use deterministic string keys and JSON field order.
Correlation uses `id`, `reply_to`, and `cause`; false and empty values remain
distinct from missing fields.
