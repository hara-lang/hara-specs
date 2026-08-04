import test from "node:test";
import assert from "node:assert/strict";
import {
  ApiProblem,
  entityTag,
  guardMethods,
  readJsonBody,
  sendJson
} from "../src/lib/api.mjs";
import {
  contentTypeForPath,
  decodeCursor,
  encodeCursor,
  findSpecification,
  listSpecifications,
  paginationLinks,
  rawGitHubUrl,
  registryMetadata
} from "../src/lib/registry-api.mjs";
import { createOpenApiDocument } from "../src/lib/openapi.mjs";

const ref = "a".repeat(40);
const registry = {
  source: {
    repository: "hara-lang/hara-specs-registry",
    requestedRef: "main",
    ref,
    indexPath: "registry-index.json",
    resolved: true
  },
  summary: { specifications: 3, requirements: 10 },
  specs: [
    {
      id: "hara/identity",
      slug: "hara-identity",
      packageName: "@hara/hara-identity",
      aliases: ["hara/id"],
      legacySlugs: ["identity"],
      title: "Hara identity",
      summary: "Publisher identity and authorization.",
      status: "draft",
      layer: "02-platform",
      owner: "hara-lang",
      classification: "hara",
      materialization: "registry",
      executable: true,
      version: "0.1.0",
      formats: ["application/edn"],
      source: { repository: "hara-lang/hara-specs-registry", ref, path: "02-platform/identity.edn" }
    },
    {
      id: "greenways/example",
      slug: "greenways-example",
      packageName: "@hara/greenways-example",
      title: "Greenways example",
      summary: "A contribution.",
      status: "draft",
      layer: "00-unsorted",
      owner: "greenways",
      classification: "contribution",
      materialization: "registry",
      executable: false,
      version: "0.2.0",
      formats: ["application/edn"],
      source: { repository: "hara-lang/hara-specs-registry", ref, path: "00-unsorted/example.edn" }
    },
    {
      id: "hara/language",
      slug: "hara-language",
      packageName: "@hara/hara-language",
      title: "Hara language",
      summary: "The language.",
      status: "ready",
      layer: "01-lang",
      owner: "hara-lang",
      classification: "hara",
      materialization: "registry",
      executable: true,
      version: "1.0.0",
      formats: ["application/edn"],
      source: { repository: "hara-lang/hara-specs-registry", ref, path: "01-lang/language.edn" }
    }
  ]
};

test("specification lookup accepts slug, package name, qualified ID, and aliases", () => {
  assert.equal(findSpecification(registry, "hara-identity")?.id, "hara/identity");
  assert.equal(findSpecification(registry, "%40hara%2Fhara-identity")?.id, "hara/identity");
  assert.equal(findSpecification(registry, "hara%2Fidentity")?.id, "hara/identity");
  assert.equal(findSpecification(registry, "hara%2Fid")?.id, "hara/identity");
  assert.equal(findSpecification(registry, "identity")?.id, "hara/identity");
  assert.equal(findSpecification(registry, "missing"), null);
});

test("registry list filtering, sorting, and cursor pagination are deterministic", () => {
  const firstParams = new URLSearchParams({ owner: "hara-lang", executable: "true", limit: "1", sort: "title" });
  const first = listSpecifications(registry, firstParams);
  assert.equal(first.page.total, 2);
  assert.equal(first.page.returned, 1);
  assert.equal(first.items[0].id, "hara/identity");
  assert.ok(first.page.nextCursor);

  const secondParams = new URLSearchParams(firstParams);
  secondParams.set("cursor", first.page.nextCursor);
  const second = listSpecifications(registry, secondParams);
  assert.equal(second.items[0].id, "hara/language");
  assert.equal(second.page.nextCursor, null);
  assert.ok(second.page.previousCursor);

  assert.equal(decodeCursor(encodeCursor(12)), 12);
});

test("invalid filters and cursors are structured API problems", () => {
  assert.throws(
    () => listSpecifications(registry, new URLSearchParams({ limit: "101" })),
    (error) => error instanceof ApiProblem && error.code === "INVALID_LIMIT"
  );
  assert.throws(
    () => listSpecifications(registry, new URLSearchParams({ executable: "maybe" })),
    (error) => error instanceof ApiProblem && error.code === "INVALID_FILTER"
  );
  assert.throws(
    () => decodeCursor("not-a-cursor"),
    (error) => error instanceof ApiProblem && error.code === "INVALID_CURSOR"
  );
});

test("registry metadata and exact raw source links preserve provenance", () => {
  const meta = registryMetadata(registry);
  assert.equal(meta.ref, ref);
  assert.equal(meta.summary.specifications, 3);
  assert.equal(
    rawGitHubUrl({ repository: "hara-lang/hara-specs-registry", ref, path: "02-platform/a file.edn" }),
    `https://raw.githubusercontent.com/hara-lang/hara-specs-registry/${ref}/02-platform/a%20file.edn`
  );
  assert.equal(contentTypeForPath("spec.edn"), "application/edn; charset=utf-8");
  assert.equal(contentTypeForPath("README.md"), "text/markdown; charset=utf-8");
});

test("pagination links preserve filters", () => {
  const links = paginationLinks("https://specs.hara-lang.io/api/v1/specs?owner=hara-lang&limit=1", {
    nextCursor: encodeCursor(1),
    previousCursor: null
  });
  assert.match(links.self, /owner=hara-lang/);
  assert.match(links.next, /cursor=/);
  assert.equal(links.previous, null);
});

test("JSON responses support request IDs, HEAD, and conditional GET without implicit wildcard CORS", async () => {
  const request = new Request("https://specs.hara-lang.io/api/v1", {
    headers: { "x-request-id": "request-1" }
  });
  const value = { apiVersion: "1", data: { status: "ok" } };
  const response = sendJson(request, value, { etag: true, cacheControl: "public, max-age=60" });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), null);
  assert.equal(response.headers.get("x-request-id"), "request-1");
  assert.equal(await response.json().then((body) => body.data.status), "ok");

  const etag = response.headers.get("etag");
  assert.equal(etag, entityTag(JSON.stringify(value)));
  const conditional = sendJson(new Request(request.url, { headers: { "if-none-match": etag } }), value, { etag: true });
  assert.equal(conditional.status, 304);

  const head = sendJson(new Request(request.url, { method: "HEAD" }), value, { etag: true });
  assert.equal(await head.text(), "");
});

test("method guards and JSON body limits return predictable results", async () => {
  const guarded = guardMethods(new Request("https://example.test/api", { method: "DELETE" }), {}, ["GET", "HEAD"]);
  assert.equal(guarded.status, 405);
  assert.equal(guarded.headers.get("allow"), "GET, HEAD");

  const options = guardMethods(new Request("https://example.test/api", { method: "OPTIONS" }), {}, ["GET", "HEAD"]);
  assert.equal(options.status, 204);
  assert.equal(options.headers.get("allow"), "GET, HEAD");
  assert.equal(options.headers.get("access-control-allow-origin"), null);

  const parsed = await readJsonBody(new Request("https://example.test/api", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ok: true })
  }));
  assert.equal(parsed.ok, true);

  await assert.rejects(
    readJsonBody(new Request("https://example.test/api", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "{}"
    })),
    (error) => error instanceof ApiProblem && error.code === "UNSUPPORTED_CONTENT_TYPE"
  );
});

test("OpenAPI document describes all version-one resources and the external identity authority", () => {
  const document = createOpenApiDocument({ origin: "https://specs.testing.hara-lang.org" });
  assert.equal(document.openapi, "3.1.0");
  assert.equal(document.servers[0].url, "https://specs.testing.hara-lang.org");
  for (const path of [
    "/api/v1/specs",
    "/api/v1/specs/{identifier}",
    "/api/v1/checks",
    "/api/v1/packages/validate"
  ]) assert.ok(document.paths[path]);
  assert.equal(document["x-hara-authorities"].identity.registry, "hara-lang/hara-identity");
});
