import test from "node:test";
import assert from "node:assert/strict";
import {
  fetchRegistryIndex,
  pinRegistryIndex,
  registryConfig,
  resolveRegistryRef,
  validateRegistryIndex
} from "../scripts/lib/registry-source.mjs";

const canonicalRepository = "hara-lang/hara-specs-registry";
const resolvedRef = "a".repeat(40);
const pinnedRef = "b".repeat(40);

const sampleIndex = () => ({
  schemaVersion: 2,
  source: {
    repository: canonicalRepository,
    ref: "main",
    manifestPath: "spec-manifest.json",
    transitional: false
  },
  summary: { specifications: 2, requirements: 3 },
  specs: [
    {
      id: "hara/example",
      slug: "hara-example",
      sourcePath: "01-lang/example.edn",
      documentationPath: "01-lang/README.md",
      source: { repository: canonicalRepository, ref: "main", path: "01-lang/example.edn" }
    },
    {
      id: "hara/pinned",
      slug: "hara-pinned",
      sourcePath: "legacy/pinned.edn",
      documentationPath: "02-platform/README.md",
      source: { repository: "hara-lang/hara-specs", ref: pinnedRef, path: "legacy/pinned.edn", blob: pinnedRef },
      documentation: { repository: canonicalRepository, ref: "main", path: "02-platform/README.md" }
    }
  ]
});

test("registry configuration defaults to the split registry", () => {
  const config = registryConfig({});
  assert.equal(config.repository, canonicalRepository);
  assert.equal(config.ref, "main");
  assert.equal(config.indexPath, "registry-index.json");
  assert.equal(config.required, false);
});

test("validation rejects transitional or duplicate catalogues", () => {
  assert.equal(validateRegistryIndex(sampleIndex()).specs.length, 2);
  const invalid = sampleIndex();
  invalid.source.transitional = true;
  invalid.specs[1].id = invalid.specs[0].id;
  assert.throws(() => validateRegistryIndex(invalid), /transitional.*duplicated|duplicated.*transitional/s);
});

test("exact registry refs do not require a GitHub API lookup", async () => {
  let calls = 0;
  const result = await resolveRegistryRef({
    repository: canonicalRepository,
    ref: resolvedRef,
    fetchImpl: async () => { calls += 1; throw new Error("unexpected"); }
  });
  assert.equal(result, resolvedRef);
  assert.equal(calls, 0);
});

test("registry fetch resolves the branch and pins only canonical locations", async () => {
  const requests = [];
  const fetchImpl = async (url) => {
    requests.push(String(url));
    if (requests.length === 1) return new Response(JSON.stringify({ sha: resolvedRef }), { status: 200 });
    return new Response(JSON.stringify(sampleIndex()), { status: 200 });
  };
  const result = await fetchRegistryIndex({ repository: canonicalRepository, ref: "main", fetchImpl });
  assert.equal(result.source.ref, resolvedRef);
  assert.equal(result.source.requestedRef, "main");
  assert.equal(result.specs[0].source.ref, resolvedRef);
  assert.equal(result.specs[1].source.ref, pinnedRef);
  assert.equal(result.specs[1].documentation.ref, resolvedRef);
  assert.match(requests[0], /api\.github\.com/);
  assert.match(requests[1], new RegExp(resolvedRef));
});

test("pinning a fetched catalogue is deterministic", () => {
  const first = pinRegistryIndex(sampleIndex(), {
    repository: canonicalRepository,
    requestedRef: "main",
    resolvedRef,
    indexPath: "registry-index.json"
  });
  const second = pinRegistryIndex(sampleIndex(), {
    repository: canonicalRepository,
    requestedRef: "main",
    resolvedRef,
    indexPath: "registry-index.json"
  });
  assert.deepEqual(first, second);
});
