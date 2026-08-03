import test from "node:test";
import assert from "node:assert/strict";
import { runReferenceCheck, validatePackageManifest } from "../src/lib/checker.mjs";

const validManifest = {
  name: "@greenways/invoice-au",
  version: "1.0.0",
  kind: "hara/spec",
  entry: "spec/main.hal",
  accepts: ["application/json"],
  description: "Invoice rules.",
  license: "Apache-2.0",
  capabilities: []
};

test("valid package manifests conform", () => {
  assert.deepEqual(validatePackageManifest(validManifest), []);
  const report = runReferenceCheck({ document: JSON.stringify(validManifest) });
  assert.equal(report.status, "completed");
  assert.equal(report.conforms, true);
  assert.equal(report.verdict, "yes");
});

test("invalid package manifests return a no verdict", () => {
  const report = runReferenceCheck({ document: JSON.stringify({ name: "invoice", version: "latest" }) });
  assert.equal(report.status, "completed");
  assert.equal(report.conforms, false);
  assert.equal(report.verdict, "no");
  assert.ok(report.summary.errors >= 4);
});

test("invalid JSON is an execution error, not non-conformity", () => {
  const report = runReferenceCheck({ document: "{" });
  assert.equal(report.status, "execution-error");
  assert.equal(report.conforms, null);
  assert.equal(report.verdict, null);
});
