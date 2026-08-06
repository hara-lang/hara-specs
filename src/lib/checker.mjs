import { parseEdn } from "./edn.mjs";

const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const COORDINATE = /^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*$/;
const SHA256 = /^sha256:[0-9a-f]{64}$/;
const ALLOWED_PROJECT_KEYS = new Set([
  "hara/type", "hara/version", "project/id", "project/version", "project/source-paths",
  "project/test-paths", "project/extension-paths", "project/artifact-paths",
  "project/archive-root", "project/capabilities", "project/main", "project/default-profile",
  "project/profiles", "project/dependencies", "project/package", "project/build",
  "project/extensions", "project/remote-artifacts"
]);

const isObject = (value) => value && typeof value === "object" && !Array.isArray(value);
const safePath = (value) => typeof value === "string"
  && value.length > 0
  && !value.includes("\\")
  && !value.includes("\0")
  && !value.startsWith("/")
  && !value.split("/").includes("..")
  && !value.split("/").includes("");

function finding(rule, severity, message, path, details = {}) {
  return { rule, severity, message, path, ...details };
}

function validatePaths(findings, value, key, required = false) {
  if (value === undefined && !required) return;
  if (!Array.isArray(value) || value.some((entry) => !safePath(entry))) {
    findings.push(finding("project/paths", "error", `:${key} must contain safe relative path strings.`, `$.${key}`));
  }
}

export function validateProjectManifest(value) {
  const findings = [];
  if (!isObject(value)) return [finding("project/object", "error", "project.edn must contain one EDN map.", "$")];

  for (const key of Object.keys(value)) {
    if (!ALLOWED_PROJECT_KEYS.has(key)) findings.push(finding("project/unknown-key", "error", `:${key} is not part of the project contract.`, `$.${key}`));
  }

  if (value["hara/type"] !== ":project") findings.push(finding("project/type", "error", ":hara/type must be :project.", "$.hara/type"));
  if (typeof value["hara/version"] !== "string" || value["hara/version"].length === 0) findings.push(finding("project/schema-version", "error", ":hara/version must be a non-empty version string.", "$.hara/version"));
  if (!COORDINATE.test(String(value["project/id"] || ""))) findings.push(finding("project/id", "error", ":project/id must use owner/name coordinates.", "$.project/id"));
  if (!SEMVER.test(String(value["project/version"] || ""))) findings.push(finding("project/version", "error", ":project/version must be semantic versioning.", "$.project/version"));

  validatePaths(findings, value["project/source-paths"], "project/source-paths", true);
  validatePaths(findings, value["project/test-paths"], "project/test-paths", true);
  validatePaths(findings, value["project/extension-paths"], "project/extension-paths", true);
  validatePaths(findings, value["project/artifact-paths"], "project/artifact-paths");

  if (value["project/archive-root"] !== undefined && !safePath(value["project/archive-root"])) findings.push(finding("project/archive-root", "error", ":project/archive-root must be a safe relative path.", "$.project/archive-root"));
  if (!Array.isArray(value["project/capabilities"])) findings.push(finding("project/capabilities", "error", ":project/capabilities must be a set of capability identifiers.", "$.project/capabilities"));
  if (value["project/dependencies"] !== undefined && !isObject(value["project/dependencies"])) findings.push(finding("project/dependencies", "error", ":project/dependencies must be a map.", "$.project/dependencies"));
  if (value["project/package"] !== undefined && !isObject(value["project/package"])) findings.push(finding("project/package", "error", ":project/package must be a map.", "$.project/package"));

  const build = value["project/build"];
  if (build !== undefined) {
    if (!isObject(build)) findings.push(finding("project/build", "error", ":project/build must be a map.", "$.project/build"));
    else {
      if (build.adapter !== ":command") findings.push(finding("project/build-adapter", "error", "The portable build adapter is :command.", "$.project/build.adapter"));
      if (!Array.isArray(build.command) || build.command.length === 0 || build.command.some((entry) => typeof entry !== "string" || entry.length === 0)) findings.push(finding("project/build-command", "error", ":command must be a non-empty argument vector.", "$.project/build.command"));
      if (build.output !== undefined && !safePath(build.output)) findings.push(finding("project/build-output", "error", ":output must be a safe relative path.", "$.project/build.output"));
      if (build["working-directory"] !== undefined && !safePath(build["working-directory"]) && build["working-directory"] !== ".") findings.push(finding("project/build-directory", "error", ":working-directory must remain inside the project.", "$.project/build.working-directory"));
    }
  }

  const extensions = value["project/extensions"];
  if (extensions !== undefined && !isObject(extensions)) findings.push(finding("project/extensions", "error", ":project/extensions must be a map keyed by namespace.", "$.project/extensions"));
  for (const [namespace, extension] of Object.entries(isObject(extensions) ? extensions : {})) {
    const base = `$.project/extensions.${namespace}`;
    if (!isObject(extension)) {
      findings.push(finding("extension/declaration", "error", "Each extension declaration must be a map.", base));
      continue;
    }
    if (![":wasm", ":hta"].includes(extension.provider)) findings.push(finding("extension/provider", "error", ":provider must be :wasm or :hta.", `${base}.provider`));
    if (typeof extension.abi !== "string" || !extension.abi.startsWith(":")) findings.push(finding("extension/abi", "error", ":abi must be a keyword.", `${base}.abi`));
    for (const key of ["root", "module"]) if (extension[key] !== undefined && !safePath(extension[key])) findings.push(finding(`extension/${key}`, "error", `:${key} must be a safe relative path.`, `${base}.${key}`));
    if (extension.assets !== undefined && (!Array.isArray(extension.assets) || extension.assets.some((entry) => !safePath(entry)))) findings.push(finding("extension/assets", "error", ":assets must contain safe relative paths.", `${base}.assets`));
    if (extension.targets !== undefined && !isObject(extension.targets)) findings.push(finding("extension/targets", "error", ":targets must be a map.", `${base}.targets`));
    if (extension.exports !== undefined && !isObject(extension.exports)) findings.push(finding("extension/exports", "error", ":exports must be a map.", `${base}.exports`));
  }

  const remote = value["project/remote-artifacts"];
  if (remote !== undefined && !isObject(remote)) findings.push(finding("project/remote-artifacts", "error", ":project/remote-artifacts must be a map keyed by install path.", "$.project/remote-artifacts"));
  for (const [installPath, artifact] of Object.entries(isObject(remote) ? remote : {})) {
    const base = `$.project/remote-artifacts.${installPath}`;
    if (!safePath(installPath) || !isObject(artifact)) {
      findings.push(finding("artifact/declaration", "error", "Remote artifacts require a safe install path and a declaration map.", base));
      continue;
    }
    if (typeof artifact.url !== "string" || !artifact.url.startsWith("https://")) findings.push(finding("artifact/url", "error", ":url must use HTTPS.", `${base}.url`));
    if (!SHA256.test(String(artifact.sha256 || ""))) findings.push(finding("artifact/sha256", "error", ":sha256 must be an exact SHA-256 digest.", `${base}.sha256`));
    if (!Number.isSafeInteger(artifact.size) || artifact.size < 0) findings.push(finding("artifact/size", "error", ":size must be a non-negative integer.", `${base}.size`));
    if (artifact.policy !== undefined && ![":mirror", ":external"].includes(artifact.policy)) findings.push(finding("artifact/policy", "error", ":policy must be :mirror or :external.", `${base}.policy`));
  }

  const packageOptions = value["project/package"];
  if (isObject(packageOptions) && (typeof packageOptions.license !== "string" || packageOptions.license.length === 0)) findings.push(finding("project/license", "warning", "Declare the package licence under :project/package.", "$.project/package.license"));
  return findings;
}

export function runReferenceCheck({ document, mediaType = "application/edn", spec = "hara/package@0.1.0", profile = "core", execution = "browser" }) {
  const startedAt = Date.now();
  if (mediaType !== "application/edn" && mediaType !== "text/edn") {
    return {
      status: "execution-error", conforms: null, verdict: null, complete: false,
      error: { code: "UNSUPPORTED_MEDIA_TYPE", message: `The project checker accepts application/edn, not ${mediaType}.` },
      spec: { ref: spec, profile }, engine: { name: "hara-project-checker", version: "0.1.0", execution },
      durationMs: Date.now() - startedAt
    };
  }

  let parsed;
  try {
    parsed = typeof document === "string" ? parseEdn(document) : document;
  } catch (error) {
    return {
      status: "execution-error", conforms: null, verdict: null, complete: false,
      error: { code: "INVALID_EDN", message: error instanceof Error ? error.message : "The document is not valid EDN." },
      spec: { ref: spec, profile }, engine: { name: "hara-project-checker", version: "0.1.0", execution },
      durationMs: Date.now() - startedAt
    };
  }

  const findings = [];
  if (spec === "hara/package@0.1.0" || spec === "hara/package") findings.push(...validateProjectManifest(parsed));
  else findings.push(finding("engine/spec-unavailable", "error", `The checker does not have executable rules for ${spec}.`, "$"));

  const errors = findings.filter(({ severity }) => severity === "error").length;
  const warnings = findings.filter(({ severity }) => severity === "warning").length;
  return {
    status: "completed", conforms: errors === 0, verdict: errors === 0 ? "yes" : "no", complete: true,
    spec: { ref: spec, profile }, document: { mediaType },
    summary: { errors, warnings, information: findings.filter(({ severity }) => severity === "information").length, rulesEvaluated: 16 },
    findings,
    engine: { name: "hara-project-checker", version: "0.1.0", execution, kernelAdapter: "pending" },
    durationMs: Date.now() - startedAt
  };
}
