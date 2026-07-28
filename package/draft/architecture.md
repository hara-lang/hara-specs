# GitHub package architecture

This is a non-normative implementation companion to
[`hal-packagespec.edn`](hal-packagespec.edn).

```text
publisher key                    hara-lang/hara-identity
     | signed release intent                 | public keys, policy, revocations
     v                                       v
source repository tag -> hara-lang/hara-packages CI -> GitHub Release assets
                             | deterministic .harp + CI attestation
                             v
                    reviewed registry release record
                             |
                             v
                 hara package sync / browser host cache
```

## Repositories

- `hara-lang/hara-packages`: package records, schemas, registry validation,
  deterministic package CI, and generated browse indexes.
- `hara-lang/hara-identity`: public Ed25519 keys, delegations, validity and
  revocation records, and protected CODEOWNERS policy.
- Source repositories: tagged package source and GitHub Release assets.

Registry CI uses a narrowly installed GitHub App to read the immutable source
tag and upload release assets. Build validation is untrusted; a distinct,
protected publishing job owns the App token and CI signing key.

## Required release assets

```text
<name>-<version>.harp
<name>-<version>.sha256
<name>-<version>.publisher-intent.edn
<name>-<version>.publisher-intent.sig
<name>-<version>.registry-attestation.edn
<name>-<version>.registry-attestation.sig
```

Clients pin both the registry revision and identity revision in
`project.lock.edn`, then verify assets by digest and detached Ed25519
signatures before cache insertion. Cached bytes are addressed by digest, not
by URL.

## Browser host

The JavaScript host obtains and verifies archives, expands safe entries into
browser storage, and registers those resources with the WASM runtime before
evaluation. It never permits `require` to trigger a fetch. A future static
browser may be hosted anywhere; its index is a cache and never replaces the
Git registry or signed release record.
