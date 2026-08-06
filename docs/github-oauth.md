# GitHub OAuth sign-in

Hara Specs uses GitHub's server-side authorization-code flow for its website session. This session identifies the GitHub account using the header and future account-aware UI; it does **not** enroll a publisher, grant a namespace, authorize a package, or bypass the independent Hara identity and registry checks.

## OAuth application registration

Create separate GitHub OAuth applications for production and testing so each deployment has an exact callback URL.

Production:

```text
Application name: Hara Specs
Homepage URL: https://specs.hara-lang.org
Authorization callback URL: https://specs.hara-lang.org/auth/github/callback
```

Testing:

```text
Application name: Hara Specs Testing
Homepage URL: https://specs.testing.hara-lang.org
Authorization callback URL: https://specs.testing.hara-lang.org/auth/github/callback
```

The sign-in flow requests only `read:user`.

## Deployment environment

Set these as encrypted Netlify environment variables with function/runtime scope on each site:

```text
HARA_GITHUB_OAUTH_CLIENT_ID=<OAuth application client ID>
HARA_GITHUB_OAUTH_CLIENT_SECRET=<OAuth application client secret>
HARA_AUTH_SESSION_SECRET=<at least 32 unpredictable characters>
```

Generate a session secret locally rather than committing one:

```sh
openssl rand -hex 32
```

The callback URI is derived from the incoming site origin. Set this only when a deployment proxy needs an explicit public callback:

```text
HARA_GITHUB_OAUTH_REDIRECT_URI=https://specs.hara-lang.org/auth/github/callback
```

## Routes

```text
GET  /auth/github
GET  /auth/github/callback
GET  /api/auth/session
HEAD /api/auth/session
POST /auth/logout
```

`/auth/github` creates an unpredictable `state` and an S256 PKCE verifier, stores both in short-lived `HttpOnly`, `SameSite=Lax` cookies, and redirects to GitHub. The callback verifies the state, exchanges the temporary code, reads the GitHub user, signs a seven-day Hara session cookie, and discards the OAuth token rather than retaining it.

The session cookie is host-only, `HttpOnly`, `SameSite=Lax`, and `Secure` on HTTPS. Return paths are restricted to relative URLs on the current Hara Specs origin.

## Local verification

Netlify Dev exposes the functions and Astro site together:

```sh
npm install
netlify dev
```

For a local OAuth application, use:

```text
Homepage URL: http://localhost:8888
Authorization callback URL: http://localhost:8888/auth/github/callback
```

Then confirm:

```sh
curl -i http://localhost:8888/api/auth/session
```

An unsigned or expired cookie returns `authenticated: false`; a missing deployment configuration returns `configured: false` without exposing any secret material.
