import registry from "../../src/generated/registry.json";
import {
  API_VERSION,
  absoluteApiUrl,
  guardMethods,
  originFor,
  sendJson
} from "../../src/lib/api.mjs";
import { registryMetadata } from "../../src/lib/registry-api.mjs";

const METHODS = ["GET", "HEAD"];

export default async (request: Request, context = {}) => {
  const early = guardMethods(request, context, METHODS, { registryRef: registry.source.ref });
  if (early) return early;

  const origin = originFor(request);
  const links = {
    self: request.url,
    current: absoluteApiUrl(request, "/api/v1"),
    openapi: absoluteApiUrl(request, "/api/openapi.json"),
    documentation: absoluteApiUrl(request, "/developers"),
    health: absoluteApiUrl(request, "/api/v1/health"),
    capabilities: absoluteApiUrl(request, "/api/v1/capabilities"),
    specifications: absoluteApiUrl(request, "/api/v1/specs"),
    checks: absoluteApiUrl(request, "/api/v1/checks"),
    packageValidation: absoluteApiUrl(request, "/api/v1/packages/validate")
  };

  return sendJson(request, {
    apiVersion: API_VERSION,
    data: {
      id: "hara-specs",
      name: "Hara Specifications API",
      status: "available",
      origin,
      versions: [{ version: API_VERSION, status: "current", url: links.current }],
      authorities: {
        specifications: {
          service: "hara-lang/hara-specs",
          registry: "hara-lang/hara-specs-registry"
        },
        identity: {
          relationship: "publisher enrollment, namespace authorization, and revocation",
          service: "https://id.hara-lang.org",
          registry: "hara-lang/hara-identity",
          status: "external"
        }
      }
    },
    meta: { registry: registryMetadata(registry) },
    links
  }, {
    context,
    methods: METHODS,
    cacheControl: "public, max-age=300, stale-while-revalidate=1800",
    registryRef: registry.source.ref,
    etag: true
  });
};

export const config = {
  path: ["/api", "/api/v1", "/.well-known/hara-specs"]
};
