import registry from "../../src/generated/registry.json";
import { validatePackageManifest } from "../../src/lib/checker.mjs";
import {
  API_VERSION,
  ApiProblem,
  absoluteApiUrl,
  guardMethods,
  problemResponse,
  readJsonBody,
  sendJson
} from "../../src/lib/api.mjs";
import { registryMetadata } from "../../src/lib/registry-api.mjs";

const METHODS = ["POST"];
const MAX_MANIFEST_BYTES = 256_000;

export default async (request: Request, context = {}) => {
  const early = guardMethods(request, context, METHODS, { registryRef: registry.source.ref });
  if (early) return early;

  const legacy = new URL(request.url).pathname === "/api/packages/validate";
  try {
    const manifest = await readJsonBody(request, { maxBytes: MAX_MANIFEST_BYTES });
    if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
      throw new ApiProblem({
        status: 400,
        code: "INVALID_MANIFEST",
        message: "The package manifest must be a JSON object."
      });
    }

    const findings = validatePackageManifest(manifest);
    const errors = findings.filter(({ severity }) => severity === "error").length;
    const warnings = findings.filter(({ severity }) => severity === "warning").length;
    const result = {
      status: "completed",
      conforms: errors === 0,
      verdict: errors === 0 ? "yes" : "no",
      summary: {
        errors,
        warnings,
        information: findings.filter(({ severity }) => severity === "information").length
      },
      findings
    };

    if (legacy) {
      return sendJson(request, {
        ...result,
        target: "hara-lang/hara-specs-registry"
      }, {
        context,
        methods: METHODS,
        registryRef: registry.source.ref,
        headers: {
          Deprecation: "true",
          Link: "</api/v1/packages/validate>; rel=\"successor-version\""
        }
      });
    }

    return sendJson(request, {
      apiVersion: API_VERSION,
      data: {
        ...result,
        target: registryMetadata(registry)
      },
      links: {
        self: request.url,
        publish: absoluteApiUrl(request, "/publish"),
        capabilities: absoluteApiUrl(request, "/api/v1/capabilities"),
        openapi: absoluteApiUrl(request, "/api/openapi.json")
      }
    }, {
      context,
      methods: METHODS,
      registryRef: registry.source.ref
    });
  } catch (error) {
    if (legacy) {
      const problem = error instanceof ApiProblem
        ? error
        : new ApiProblem({ status: 400, code: "INVALID_JSON", message: error instanceof Error ? error.message : "Invalid request." });
      return sendJson(request, {
        status: "execution-error",
        conforms: null,
        verdict: null,
        error: { code: problem.code, message: problem.message }
      }, {
        context,
        status: problem.status,
        methods: METHODS,
        registryRef: registry.source.ref,
        headers: {
          Deprecation: "true",
          Link: "</api/v1/packages/validate>; rel=\"successor-version\""
        }
      });
    }
    return problemResponse(request, error, { context, methods: METHODS, registryRef: registry.source.ref });
  }
};

export const config = {
  path: ["/api/packages/validate", "/api/v1/packages/validate"]
};
