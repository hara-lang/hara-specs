import test from "node:test";
import assert from "node:assert/strict";
import { runReferenceCheck, validateProjectManifest } from "../src/lib/checker.mjs";
import { parseEdn } from "../src/lib/edn.mjs";

const validProject = `{:hara/type :project
 :hara/version "1.0.0"
 :project/id greenways/invoice-au
 :project/version "1.0.0"
 :project/source-paths ["src"]
 :project/test-paths ["test"]
 :project/extension-paths ["artifacts"]
 :project/capabilities #{}
 :project/dependencies {}
 :project/package {:license "Apache-2.0"}
 :project/extensions
 {invoice.native {:provider :wasm
                  :abi :core.v1
                  :module "artifacts/invoice.wasm"}}}`;

test("valid project manifests conform", () => {
  assert.deepEqual(validateProjectManifest(parseEdn(validProject)), []);
  const report = runReferenceCheck({ document: validProject });
  assert.equal(report.status, "completed");
  assert.equal(report.conforms, true);
  assert.equal(report.verdict, "yes");
});

test("invalid project manifests return a no verdict", () => {
  const report = runReferenceCheck({ document: `{:hara/type :project :project/id invoice}` });
  assert.equal(report.status, "completed");
  assert.equal(report.conforms, false);
  assert.equal(report.verdict, "no");
  assert.ok(report.summary.errors >= 5);
});

test("invalid EDN is an execution error, not non-conformity", () => {
  const report = runReferenceCheck({ document: "{" });
  assert.equal(report.status, "execution-error");
  assert.equal(report.conforms, null);
  assert.equal(report.verdict, null);
  assert.equal(report.error.code, "INVALID_EDN");
});

test("unknown project keys are rejected", () => {
  const project = parseEdn(validProject.trim().replace(/}$/, " :project/unknown true}"));
  assert.ok(validateProjectManifest(project).some(({ rule }) => rule === "project/unknown-key"));
});
