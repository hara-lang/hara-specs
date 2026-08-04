const PACKAGE_KINDS = [
  "hara/spec",
  "hara/profile",
  "hara/rules",
  "hara/adapter",
  "hara/dataset"
];

const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const PACKAGE_NAME = /^@[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*$/;

function finding(rule, severity, message, path, details = {}) {
  return { rule, severity, message, path, ...details };
}

export function validatePackageManifest(value) {
  const findings = [];

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [finding("package/object", "error", "The package manifest must be a JSON object.", "$")];
  }

  if (typeof value.name !== "string" || !PACKAGE_NAME.test(value.name)) {
    findings.push(finding(
      "package/name",
      "error",
      "Package name must use the form @scope/name with lowercase registry-safe characters.",
      "$.name",
      { expected: "@scope/name", actual: value.name ?? null }
    ));
  }

  if (typeof value.version !== "string" || !SEMVER.test(value.version)) {
    findings.push(finding(
      "package/version",
      "error",
      "Version must be a semantic version such as 1.0.0 or 1.0.0-draft.1.",
      "$.version",
      { expected: "semantic version", actual: value.version ?? null }
    ));
  }

  if (!PACKAGE_KINDS.includes(value.kind)) {
    findings.push(finding(
      "package/kind",
      "error",
      "Package kind is not recognised by the Hara specification registry.",
      "$.kind",
      { expected: PACKAGE_KINDS, actual: value.kind ?? null }
    ));
  }

  if (typeof value.entry !== "string" || !value.entry.endsWith(".hal")) {
    findings.push(finding(
      "package/entry",
      "error",
      "Executable specification packages must identify a .hal entry file.",
      "$.entry",
      { expected: "path ending in .hal", actual: value.entry ?? null }
    ));
  }

  if (!Array.isArray(value.accepts) || value.accepts.length === 0 || value.accepts.some((item) => typeof item !== "string" || !item.includes("/"))) {
    findings.push(finding(
      "package/accepts",
      "error",
      "The accepts field must contain at least one media type.",
      "$.accepts",
      { expected: ["application/json"], actual: value.accepts ?? null }
    ));
  }

  if (!value.description || typeof value.description !== "string") {
    findings.push(finding(
      "package/description",
      "warning",
      "Add a concise description so people can discover and evaluate the specification.",
      "$.description"
    ));
  }

  if (!value.license || typeof value.license !== "string") {
    findings.push(finding(
      "package/license",
      "warning",
      "Declare the licence governing the specification package.",
      "$.license"
    ));
  }

  if (value.capabilities && (!Array.isArray(value.capabilities) || value.capabilities.some((item) => typeof item !== "string"))) {
    findings.push(finding(
      "package/capabilities",
      "error",
      "Capabilities must be an array of capability identifiers.",
      "$.capabilities"
    ));
  }

  return findings;
}

export function runReferenceCheck({ document, mediaType = "application/json", spec = "@hara/spec-package@0.1.0", profile = "core", execution = "browser" }) {
  const startedAt = Date.now();
  const findings = [];
  let parsed;

  if (mediaType !== "application/json") {
    return {
      status: "execution-error",
      conforms: null,
      verdict: null,
      complete: false,
      error: {
        code: "UNSUPPORTED_MEDIA_TYPE",
        message: `The reference checker currently accepts application/json, not ${mediaType}.`
      },
      spec: { ref: spec, profile },
      engine: { name: "hara-reference-checker", version: "0.1.0", execution },
      durationMs: Date.now() - startedAt
    };
  }

  try {
    parsed = typeof document === "string" ? JSON.parse(document) : document;
  } catch (error) {
    return {
      status: "execution-error",
      conforms: null,
      verdict: null,
      complete: false,
      error: {
        code: "INVALID_JSON",
        message: error instanceof Error ? error.message : "The document is not valid JSON."
      },
      spec: { ref: spec, profile },
      engine: { name: "hara-reference-checker", version: "0.1.0", execution },
      durationMs: Date.now() - startedAt
    };
  }

  if (spec === "@hara/spec-package@0.1.0") {
    findings.push(...validatePackageManifest(parsed));
  } else {
    findings.push(finding(
      "engine/spec-unavailable",
      "error",
      `The reference checker does not have executable rules for ${spec}.`,
      "$",
      { remediation: "Connect the Hara kernel adapter or select @hara/spec-package@0.1.0." }
    ));
  }

  const errors = findings.filter(({ severity }) => severity === "error").length;
  const warnings = findings.filter(({ severity }) => severity === "warning").length;

  return {
    status: "completed",
    conforms: errors === 0,
    verdict: errors === 0 ? "yes" : "no",
    complete: true,
    spec: { ref: spec, profile },
    document: { mediaType },
    summary: {
      errors,
      warnings,
      information: findings.filter(({ severity }) => severity === "information").length,
      rulesEvaluated: 8
    },
    findings,
    engine: {
      name: "hara-reference-checker",
      version: "0.1.0",
      execution,
      kernelAdapter: "pending"
    },
    durationMs: Date.now() - startedAt
  };
}
