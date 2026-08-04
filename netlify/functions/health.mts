import registry from "../../src/generated/registry.json";
import {
  API_VERSION,
  ApiProblem,
  guardMethods,
  problemResponse,
  sendJson
} from "../../src/lib/api.mjs";
import { registryMetadata } from "../../src/lib/registry-api.mjs";

const METHODS = ["GET", "HEAD"];
const SHA_PATTERN = /^[0-9a-f]{40}$/i;

export default async (request: Request, context = {}) => {
  const early = guardMethods(request, context, METHODS, { registryRef: registry.source.ref });
  if (early) return early;

  const registryState = registryMetadata(registry);
  const ready = SHA_PATTERN.test(registry.source.ref || "") && registry.summary.specifications > 0;
  if (!ready) {
    return problemResponse(request, new ApiProblem({
      status: 503,
      code: "REGISTRY_UNAVAILABLE",
      message: "The service does not have a resolved specifications registry.",
      details: { registry: registryState }
    }), { context, methods: METHODS, registryRef: registry.source.ref });
  }

  return sendJson(request, {
    apiVersion: API_VERSION,
    data: {
      status: "ok",
      checkedAt: new Date().toISOString(),
      service: "hara-specs",
      registry: registryState,
      deploy: {
        id: context?.deploy?.id || null,
        context: context?.deploy?.context || null,
        published: context?.deploy?.published ?? null,
        site: context?.site?.name || null
      }
    }
  }, {
    context,
    methods: METHODS,
    cacheControl: "no-store",
    registryRef: registry.source.ref
  });
};

export const config = { path: "/api/v1/health" };
