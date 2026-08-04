import registry from "../../src/generated/registry.json";
import { runReferenceCheck } from "../../src/lib/checker.mjs";
import {
  API_VERSION,
  ApiProblem,
  absoluteApiUrl,
  guardMethods,
  problemResponse,
  readJsonBody,
  sendJson
} from "../../src/lib/api.mjs";
import { findSpecification, registryMetadata } from "../../src/lib/registry-api.mjs";

const METHODS = ["POST"];
const MAX_DOCUMENT_BYTES = 1_000_000;

function legacyFailure(error) {
  const problem = error instanceof ApiProblem
    ? error
    : new ApiProblem({
      status: 400,
      code: "INVALID_REQUEST",
      message: error instanceof Error ? error.message : "The request body could not be read."
    });
  return {
    status: "execution-error",
    conforms: null,
    verdict: null,
    error: { code: problem.code, message: problem.message }
  };
}

export default async (request: Request, context = {}) => {
  const early = guardMethods(request, context, METHODS, { registryRef: registry.source.ref });
  if (early) return early;

  const pathname = new URL(request.url).pathname;
  const legacy = pathname === "/api/check";
  try {
    const payload = await readJsonBody(request, { maxBytes: MAX_DOCUMENT_BYTES });
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new ApiProblem({
        status: 400,
        code: "INVALID_REQUEST",
        message: "The check request must be a JSON object."
      });
    }
    if (!legacy && !("document" in payload)) {
      throw new ApiProblem({
        status: 400,
        code: "MISSING_DOCUMENT",
        message: "The version-one check request requires a document field."
      });
    }

    const report = runReferenceCheck({ ...payload, execution: "server" });
    const status = report.status === "completed" ? 200 : 422;
    if (legacy) {
      return sendJson(request, report, {
        context,
        status,
        methods: METHODS,
        registryRef: registry.source.ref,
        headers: {
          Deprecation: "true",
          Link: "</api/v1/checks>; rel=\"successor-version\""
        }
      });
    }

    const specification = findSpecification(registry, payload.spec);
    return sendJson(request, {
      apiVersion: API_VERSION,
      data: report,
      meta: { registry: registryMetadata(registry) },
      links: {
        self: request.url,
        capabilities: absoluteApiUrl(request, "/api/v1/capabilities"),
        openapi: absoluteApiUrl(request, "/api/openapi.json"),
        ...(specification ? {
          specification: absoluteApiUrl(request, `/api/v1/specs/${encodeURIComponent(specification.slug)}`)
        } : {})
      }
    }, {
      context,
      status,
      methods: METHODS,
      registryRef: registry.source.ref
    });
  } catch (error) {
    if (legacy) {
      const failure = legacyFailure(error);
      const status = error instanceof ApiProblem ? error.status : 400;
      return sendJson(request, failure, {
        context,
        status,
        methods: METHODS,
        registryRef: registry.source.ref,
        headers: {
          Deprecation: "true",
          Link: "</api/v1/checks>; rel=\"successor-version\""
        }
      });
    }
    return problemResponse(request, error, { context, methods: METHODS, registryRef: registry.source.ref });
  }
};

export const config = {
  path: ["/api/check", "/api/v1/check", "/api/v1/checks"]
};
