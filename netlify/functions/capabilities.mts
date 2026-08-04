import registry from "../../src/generated/registry.json";
import { API_VERSION, absoluteApiUrl, guardMethods, sendJson } from "../../src/lib/api.mjs";
import { registryApiLimits, registryMetadata } from "../../src/lib/registry-api.mjs";

const METHODS = ["GET", "HEAD"];

export default async (request: Request, context = {}) => {
  const early = guardMethods(request, context, METHODS, { registryRef: registry.source.ref });
  if (early) return early;

  return sendJson(request, {
    apiVersion: API_VERSION,
    data: {
      registry: {
        read: true,
        sourceRepresentations: true,
        filters: ["q", "status", "layer", "owner", "classification", "materialization", "executable"],
        sorts: ["title", "id", "layer", "version"],
        pagination: "cursor"
      },
      checks: {
        browser: true,
        server: true,
        mediaTypes: ["application/json"],
        executableSpecifications: [
          { ref: "@hara/spec-package@0.1.0", profiles: ["core"], engine: "hara-reference-checker" }
        ],
        resultStates: ["yes", "no", "execution-error"]
      },
      packages: {
        validation: true,
        kinds: ["hara/spec", "hara/profile", "hara/rules", "hara/adapter", "hara/dataset"],
        canonicalWrites: false
      },
      publishing: {
        status: "validation-only",
        canonicalWrites: false,
        blockers: [
          "publisher identity and key verification",
          "namespace ownership",
          "immutable version enforcement",
          "package digest and signature verification",
          "conformance fixture gates",
          "path-scoped GitHub credentials"
        ],
        identityAuthority: {
          service: "https://id.hara-lang.org",
          registry: "hara-lang/hara-identity",
          status: "external"
        }
      },
      limits: {
        requestBodyBytes: 1_000_000,
        defaultPageSize: registryApiLimits.defaultPageSize,
        maximumPageSize: registryApiLimits.maximumPageSize,
        maximumSourceBytes: registryApiLimits.maximumSourceBytes
      }
    },
    meta: { registry: registryMetadata(registry) },
    links: {
      self: request.url,
      specifications: absoluteApiUrl(request, "/api/v1/specs"),
      checks: absoluteApiUrl(request, "/api/v1/checks"),
      packageValidation: absoluteApiUrl(request, "/api/v1/packages/validate"),
      openapi: absoluteApiUrl(request, "/api/openapi.json")
    }
  }, {
    context,
    methods: METHODS,
    cacheControl: "public, max-age=300, stale-while-revalidate=1800",
    registryRef: registry.source.ref,
    etag: true
  });
};

export const config = { path: "/api/v1/capabilities" };
