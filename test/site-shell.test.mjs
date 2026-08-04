import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const layout = await readFile(new URL("../src/layouts/AppLayout.astro", import.meta.url), "utf8");
const shell = await readFile(new URL("../src/styles/shell.css", import.meta.url), "utf8");
const config = await readFile(new URL("../astro.config.mjs", import.meta.url), "utf8");
const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");

test("uses the canonical specs domain", () => {
  assert.match(config, /https:\/\/specs\.hara-lang\.org/);
  assert.doesNotMatch(config, /hara-lang\.io/);
  assert.match(readme, /specs\.hara-lang\.org/);
  assert.doesNotMatch(readme, /specs\.hara-lang\.io/);
});

test("conforms to the Hara ecosystem shell", () => {
  assert.match(layout, /Benchmarks[\s\S]*Docs[\s\S]*aria-current="page" aria-disabled="true">Specs/);
  assert.doesNotMatch(layout, />Source<\/a>/);
  assert.match(layout, /class="context-nav"/);
  assert.match(layout, /Overview[\s\S]*Registry[\s\S]*Check[\s\S]*Publish[\s\S]*API/);
  assert.match(layout, /href="\/developers"/);
  assert.match(shell, /grid-template-columns: 1fr auto 1fr/);
});

test("includes a sign-in button without coupling to an identity implementation", () => {
  assert.ok(layout.includes('href="https://id.hara-lang.org/">Sign in</a>'));
  assert.doesNotMatch(layout, /api\/session|auth\/github|return_to/);
});
