import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const layout = await readFile(new URL("../src/layouts/AppLayout.astro", import.meta.url), "utf8");

test("opts every Specs page into the shared popup sign-in mode", () => {
  assert.match(layout, /<meta name="hara-identity-mode" content="popup" \/>/);
  assert.match(layout, /data-hara-identity/);
  assert.match(layout, /identity-client\.js/);
  assert.match(layout, /https:\/\/id\.hara-lang\.org/);
  assert.match(layout, /https:\/\/id\.testing\.hara-lang\.org/);
});

test("keeps OAuth ownership at Identity", () => {
  assert.doesNotMatch(layout, /client_secret|access_token|HARA_GITHUB_OAUTH_CLIENT_SECRET/);
  assert.doesNotMatch(layout, /\/auth\/github\/callback/);
});
