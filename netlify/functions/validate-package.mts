import registry from "../../src/generated/registry.json";
import { runReferenceCheck } from "../../src/lib/checker.mjs";
import {
  API_VERSION,
  ApiProblem,
  absoluteApiUrl,
  guardMethods,
  problemResponse,
  sendJson
} from "../../src/lib/api.mjs";
import { registryMetadata } from "../../src/lib/registry-api.mjs";

const METHODS = ["POST"];
const MAX_PROJECT_BYTES = 256_000;
const MEDIA_TYPES = new Set(["application/edn", "text/edn"]);

export default async (request: Request, context = {}) => {
  const early = guardMethods(request, context, METHODS, { registryRef: registry.source.ref });
  if (early) return early;

  try {
    const mediaType = (request.headers.get("content-type") || "").split(";", 1)[0].trim().toLowerCase();
    if (!MEDIA_TYPES.has(mediaType)) throw new ApiProblem({ status: 415, code: "UNSUPPORTED_CONTENT_TYPE", message: "Send project.edn as application/edn." });
    const document = await request.text();
    if (new TextEncoder().encode(document).byteLength > MAX_PROJECT_BYTES) throw new ApiProblem({ status: 413, code: "PROJECT_TOO_LARGE", message: `project.edn exceeds ${MAX_PROJECT_BYTES} bytes.` });
    if (!document.trim()) throw new ApiProblem({ status: 400, code: "EMPTY_PROJECT", message: "project.edn must not be empty." });

    const report = runReferenceCheck({ document, mediaType: "application/edn", spec: "hara/package@0.1.0", execution: "server" });
    if (report.status === "execution-error") throw new ApiProblem({ status: 400, code: report.error?.code || "INVALID_EDN", message: report.error?.message || "project.edn could not be parsed." });

    return sendJson(request, {
      apiVersion: API_VERSION,
      data: { ...report, target: registryMetadata(registry) },
      links: {
        self: request.url,
        publish: absoluteApiUrl(request, "/publish"),
        capabilities: absoluteApiUrl(request, "/api/v1/capabilities"),
        openapi: absoluteApiUrl(request, "/api/openapi.json")
      }
    }, { context, methods: METHODS, registryRef: registry.source.ref });
  } catch (error) {
    return problemResponse(request, error, { context, methods: METHODS, registryRef: registry.source.ref });
  }
};

export const config = { path: "/api/v1/packages/validate" };
