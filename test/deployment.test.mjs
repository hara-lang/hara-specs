import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflow = await readFile(new URL("../.github/workflows/pages-specs.yml", import.meta.url), "utf8");

test("builds and verifies the Astro service before deploying Netlify output", () => {
  assert.match(workflow, /node-version: 24/);
  assert.match(workflow, /npm install/);
  assert.match(workflow, /npm run registry:build/);
  assert.match(workflow, /npm run registry:check/);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /npm run build/);
  assert.equal((workflow.match(/--dir dist/g) ?? []).length, 2);
  assert.doesNotMatch(workflow, /--dir \.(?:\s|$)/);
});

test("deploys testing and production from their intended branches", () => {
  assert.match(workflow, /branches: \[main, production\]/);
  assert.match(workflow, /github\.ref_name == 'main'[\s\S]*NETLIFY_TESTING_SITE_ID/);
  assert.match(workflow, /github\.ref_name == 'production'[\s\S]*NETLIFY_PRODUCTION_SITE_ID/);
});

test("makes canonical domain, DNS and TLS reconciliation a required production gate", () => {
  const deployIndex = workflow.indexOf("Deploy production to Netlify");
  const domainIndex = workflow.indexOf("Assign the canonical production domain and reconcile DNS");
  const verifyIndex = workflow.indexOf("Verify the canonical production UI and API");

  assert.ok(deployIndex >= 0);
  assert.ok(domainIndex > deployIndex);
  assert.ok(verifyIndex > domainIndex);
  assert.doesNotMatch(workflow, /Assign the canonical production domain[\s\S]*continue-on-error: true/);
  assert.match(workflow, /--request PATCH/);
  assert.match(workflow, /api\.netlify\.com\/api\/v1\/sites\/\$NETLIFY_SITE_ID/);
  assert.match(workflow, /CANONICAL_DOMAIN: specs\.hara-lang\.org/);
  assert.match(workflow, /CLOUDFLARE_API_TOKEN/);
  assert.match(workflow, /api\.cloudflare\.com\/client\/v4\/zones/);
  assert.match(workflow, /api\.netlify\.com\/api\/v1\/dns_zones/);
  assert.match(workflow, /api\.netlify\.com\/api\/v1\/sites\/\$NETLIFY_SITE_ID\/ssl/);
  assert.match(workflow, /force_ssl:true/);
  assert.match(workflow, /api\/v1\/health/);
  assert.doesNotMatch(workflow, /specs\.hara-long\.org/);
});
