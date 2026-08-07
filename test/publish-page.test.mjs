import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile(new URL("../src/pages/publish.astro", import.meta.url), "utf8");

test("authors and validates the single project.edn contract", () => {
  assert.match(page, /Project publishing/);
  assert.match(page, /<h2>project\.edn<\/h2>/);
  assert.match(page, /validateProjectManifest/);
  assert.match(page, /"hara\/type": ":project"/);
  assert.match(page, /"project\/id"/);
  assert.match(page, /"project\/source-paths"/);
  assert.match(page, /"project\/test-paths"/);
  assert.match(page, /"project\/extension-paths"/);
  assert.match(page, /"project\/capabilities"/);
  assert.match(page, /"project\/dependencies"/);
  assert.match(page, /"project\/package"/);
  assert.match(page, /application\/edn/);
  assert.match(page, /anchor\.download = "project\.edn"/);
});

test("does not revive superseded package authoring surfaces", () => {
  const forbidden = [
    "validate" + "PackageManifest",
    "hara" + ".package.json",
    "project" + ".hal",
    "hara" + ".extension.edn",
    "hara" + ".build.edn",
    "hara" + ".recipe.edn",
    "hara" + ".install.edn",
    "@hara/" + "spec-package",
    "@scope/" + "name",
    "/api/packages/" + "validate",
    "package" + "Name",
    "legacy" + "Slugs"
  ];
  for (const token of forbidden) assert.equal(page.includes(token), false, token);
});
