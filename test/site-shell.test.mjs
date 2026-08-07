import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const layout = await readFile(new URL("../src/layouts/AppLayout.astro", import.meta.url), "utf8");
const shell = await readFile(new URL("../src/styles/shell.css", import.meta.url), "utf8");
const config = await readFile(new URL("../astro.config.mjs", import.meta.url), "utf8");
const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
const verifier = await readFile(new URL("../.github/scripts/verify-shared-identity.sh", import.meta.url), "utf8");
const workflow = await readFile(new URL("../.github/workflows/pages-specs.yml", import.meta.url), "utf8");

test("uses the canonical specs domain", () => {
  assert.match(config, /https:\/\/specs\.hara-lang\.org/);
  assert.doesNotMatch(config, /hara-lang\.io/);
  assert.match(readme, /specs\.hara-lang\.org/);
  assert.doesNotMatch(readme, /specs\.hara-lang\.io/);
});

test("publishes a dedicated maximum-resolution specifications card", () => {
  assert.match(layout, /og-hara-specs\.jpg/);
  assert.match(layout, /og:image:width" content="3840"/);
  assert.match(layout, /og:image:height" content="2016"/);
});

test("keeps the Hara brand and actions at the edges with ecosystem links centred", () => {
  assert.match(layout, /Benchmarks[\s\S]*Docs[\s\S]*aria-current="page" aria-disabled="true">Specs[\s\S]*World/);
  assert.match(layout, /https:\/\/world\.hara-lang\.org\//);
  assert.doesNotMatch(layout, />Source<\/a>/);
  assert.match(shell, /grid-template-columns: minmax\(0, 1fr\) auto minmax\(0, 1fr\)/);
  assert.match(shell, /\.app-header \.brand \{ justify-self: start; \}/);
  assert.match(shell, /\.header-actions[\s\S]*justify-self: end/);
  assert.match(shell, /\.app-header \.ecosystem-nav[\s\S]*justify-self: center/);
});

test("places specifications navigation in a fixed right rail on desktop", () => {
  assert.match(layout, /class="context-nav"/);
  assert.match(layout, /Overview[\s\S]*Registry[\s\S]*Check[\s\S]*Publish[\s\S]*API/);
  assert.match(layout, /href="\/developers"/);
  assert.match(shell, /@media \(min-width: 981px\)/);
  assert.match(shell, /\.context-nav[\s\S]*position: fixed[\s\S]*right: 0[\s\S]*bottom: 0/);
  assert.match(shell, /\.context-nav > div[\s\S]*flex-direction: column/);
  assert.match(shell, /main,[\s\S]*\.app-footer[\s\S]*margin-right: var\(--app-context-width\)/);
});

test("uses the central Hara GitHub identity with a local fallback", () => {
  assert.match(layout, /data-hara-identity/);
  assert.match(layout, /data-hara-identity-fallback/);
  assert.match(layout, /aria-label="Sign in with GitHub"/);
  assert.match(layout, /https:\/\/id\.hara-lang\.org/);
  assert.match(layout, /https:\/\/id\.testing\.hara-lang\.org/);
  assert.match(layout, /\/v1\/identity-client\.js/);
  assert.match(layout, /new URL\("\/github\/start", identityOrigin\)/);
  assert.match(layout, /signIn\.searchParams\.set\("returnTo", location\.href\)/);
  assert.doesNotMatch(layout, /\/auth\/github\?return_to=/);
  assert.doesNotMatch(layout, /fetch\("\/api\/auth\/session"/);
  assert.doesNotMatch(layout, /action="\/auth\/logout"/);
  assert.match(readme, /shared GitHub identity/);
});

test("gates testing and production deploys on identity contract v1", () => {
  assert.match(verifier, /\.contractVersion == 1/);
  assert.match(verifier, /\.clientVersion == 1/);
  assert.match(verifier, /\.clientEndpoint == \(\$identity \+ "\/v1\/identity-client\.js"\)/);
  assert.match(verifier, /Access-Control-Allow-Origin/);
  assert.match(verifier, /https:\/\/untrusted\.example/);
  assert.match(verifier, /v1\/identity-client\.js/);
  assert.match(workflow, /Verify built shared identity shell/);
  assert.match(workflow, /Verify testing shared identity/);
  assert.match(workflow, /HARA_SITE_ORIGIN: https:\/\/specs\.testing\.hara-lang\.org/);
  assert.match(workflow, /HARA_IDENTITY_ORIGIN: https:\/\/id\.testing\.hara-lang\.org/);
  assert.match(workflow, /Verify production shared identity/);
  assert.match(workflow, /HARA_SITE_ORIGIN: https:\/\/specs\.hara-lang\.org/);
  assert.match(workflow, /HARA_IDENTITY_ORIGIN: https:\/\/id\.hara-lang\.org/);
  assert.match(workflow, /HARA_GITHUB_OAUTH_CLIENT_SECRET\|HARA_AUTH_SESSION_SECRET\|\/auth\/github\/callback/);
});

test("uses icons only for system, light, and dark theme states", () => {
  assert.match(layout, /const themeIcons = \{[\s\S]*system:[\s\S]*light:[\s\S]*dark:/);
  assert.match(layout, /data-hara-theme-icon/);
  assert.match(shell, /\.app-header \.hara-theme-toggle \[data-hara-theme-label\][\s\S]*position: absolute/);
  assert.match(shell, /\.app-header \.hara-theme-toggle \[data-hara-theme-icon\] svg/);
});

test("identifies Greenways stewardship and the repository licence", () => {
  assert.match(layout, /A Greenways Open Source Project/);
  assert.match(layout, /opensource\.greenways\.ai\/open-source/);
  assert.match(layout, /hara-specs\/blob\/main\/LICENSE">Apache-2\.0/);
});
