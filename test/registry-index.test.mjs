import test from "node:test";
import assert from "node:assert/strict";
import { createRegistryIndex, parseSpecDocument } from "../scripts/lib/registry-index.mjs";

const source = `{:document/id :hal/example
 :document/type :language-spec
 :document/version "1.2.0-draft"
 :document/status :draft
 :document/title "HAL example"
 :document/summary "Example specification."
 :scope/data-notation {:notation/extension ".edn"}
 :spec/sections [{:section/requirements [{:requirement/id :example/one}]}]}`;

const file = {
  path: "01-lang/100-example/draft/example.edn",
  kind: "edn",
  classification: "hara",
  owner: "hara-lang"
};

test("EDN metadata is converted into a registry entry", () => {
  const parsed = parseSpecDocument(source, file);
  assert.equal(parsed.id, "hal/example");
  assert.equal(parsed.packageName, "@hara/hal-example");
  assert.equal(parsed.version, "1.2.0-draft");
  assert.equal(parsed.requirements, 1);
});

test("registry indexes only draft, ready, and metaspec EDN sources", () => {
  const index = createRegistryIndex({
    manifest: { files: [file, { path: "notes.edn", kind: "edn" }] },
    documents: new Map([[file.path, source], ["notes.edn", source]])
  });
  assert.equal(index.summary.specifications, 1);
  assert.equal(index.summary.requirements, 1);
  assert.equal(index.specs[0].slug, "hal-example");
});
