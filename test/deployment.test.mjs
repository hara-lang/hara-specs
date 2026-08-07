import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflow = await readFile(new URL("../.github/workflows/pages-specs.yml", import.meta.url), "utf8");
const fallback = await readFile(new URL("../.github/workflows/pages-fallback.yml", import.meta.url), "utf8");
const projectContract = await readFile(new URL("../.github/workflows/project-manifest-contract.yml", import.meta.url), "utf8");

test("builds the Astro service before deploying Netlify output", () => {
  assert.match(workflow, /node-version: 24/);
  assert.match(workflow, /npm install/);
  assert.match(workflow, /npm run build/);
  assert.equal((workflow.match(/--dir dist/g) ?? []).length, 2);
  assert.doesNotMatch(workflow, /--dir \.(?:\s|$)/);
});

test("deploys testing and production from their intended branches", () => {
  assert.match(workflow, /branches: \[main, production\]/);
  assert.match(workflow, /github\.ref_name == 'main'[\s\S]*NETLIFY_TESTING_SITE_ID/);
  assert.match(workflow, /github\.ref_name == 'production'[\s\S]*NETLIFY_PRODUCTION_SITE_ID/);
});

test("publishes production before non-blocking domain correction", () => {
  const deployIndex = workflow.indexOf("Deploy production to specs.hara-lang.org");
  const domainIndex = workflow.indexOf("Correct the production domain");

  assert.ok(deployIndex >= 0);
  assert.ok(domainIndex > deployIndex);
  assert.match(workflow, /Correct the production domain[\s\S]*continue-on-error: true/);
  assert.match(workflow, /--request PATCH/);
  assert.match(workflow, /api\.netlify\.com\/api\/v1\/sites\/\$\{NETLIFY_SITE_ID\}/);
  assert.match(workflow, /"custom_domain":"specs\.hara-lang\.org"/);
  assert.match(workflow, /"force_ssl":true/);
  assert.doesNotMatch(workflow, /specs\.hara-long\.org/);
});

test("builds pull-request Pages fallbacks from the proposed merge result", () => {
  assert.match(fallback, /github\.event_name == 'pull_request'/);
  assert.match(fallback, /github\.ref/);
  assert.match(fallback, /\|\| 'main'/);
  assert.doesNotMatch(fallback, /github\.event\.pull_request\.head\.sha/);
  assert.doesNotMatch(fallback, /with:\s*\n\s*ref: main/);
});

test("guards project authoring sources without scanning generated registry snapshots", () => {
  assert.match(projectContract, /branches: \[main, production\]/);
  assert.match(projectContract, /src\/generated\//);
  assert.match(projectContract, /public\/registry\//);
  assert.match(projectContract, /deprecated_tokens/);
  assert.match(projectContract, /Reject superseded project authoring contracts/);
});
