# Shared GitHub identity

Hara Specs does not run an independent OAuth client or issue its own browser session. The header uses the shared account client served by `id.hara-lang.org`.

Production:

```text
client:  https://id.hara-lang.org/identity-client.js
session: https://id.hara-lang.org/session
sign-in: https://id.hara-lang.org/github/start?returnTo=<current Specs URL>
sign-out: POST https://id.hara-lang.org/logout
```

Testing uses the equivalent `id.testing.hara-lang.org` endpoints. The client chooses the issuer from the current Specs hostname.

The identity origin holds one host-only `HttpOnly` session cookie. Specs reads the public GitHub profile through a credentialed, exact-origin CORS request. OAuth credentials and the session-signing secret belong only to the Identity deployment and must not be copied into the Specs environment.

This web identity establishes which GitHub account is operating the UI. It does not enroll a publisher, prove possession of a package signing key, grant a namespace, authorize a package, or bypass the independent identity-registry and specifications-registry checks.
