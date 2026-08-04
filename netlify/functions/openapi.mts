import { guardMethods, originFor, sendJson } from "../../src/lib/api.mjs";
import { createOpenApiDocument } from "../../src/lib/openapi.mjs";

const METHODS = ["GET", "HEAD"];

export default async (request: Request, context = {}) => {
  const early = guardMethods(request, context, METHODS);
  if (early) return early;
  return sendJson(request, createOpenApiDocument({ origin: originFor(request) }), {
    context,
    methods: METHODS,
    cacheControl: "public, max-age=3600, stale-while-revalidate=86400",
    etag: true
  });
};

export const config = { path: "/api/openapi.json" };
