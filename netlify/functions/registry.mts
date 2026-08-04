import registry from "../../src/generated/registry.json";
import { guardMethods, sendJson } from "../../src/lib/api.mjs";

const METHODS = ["GET", "HEAD"];

export default async (request: Request, context = {}) => {
  const early = guardMethods(request, context, METHODS, { registryRef: registry.source.ref });
  if (early) return early;

  const url = new URL(request.url);
  const query = (url.searchParams.get("q") || "").trim().toLowerCase();
  const status = url.searchParams.get("status");
  const layer = url.searchParams.get("layer");
  const owner = url.searchParams.get("owner");
  const classification = url.searchParams.get("classification");
  const executable = url.searchParams.get("executable");
  const specs = registry.specs.filter((spec) => {
    const aliases = [...(spec.aliases || []), ...(spec.legacySlugs || [])].join(" ");
    const haystack = `${spec.id} ${aliases} ${spec.packageName} ${spec.title} ${spec.summary} ${spec.owner}`.toLowerCase();
    return (!query || haystack.includes(query)) &&
      (!status || status === "all" || spec.status === status) &&
      (!layer || layer === "all" || spec.layer === layer) &&
      (!owner || owner === "all" || spec.owner === owner) &&
      (!classification || classification === "all" || spec.classification === classification) &&
      (!executable || executable === "all" || String(Boolean(spec.executable)) === executable);
  });

  return sendJson(request, {
    ...registry,
    summary: { ...registry.summary, returned: specs.length },
    specs
  }, {
    context,
    methods: METHODS,
    cacheControl: "public, max-age=60, stale-while-revalidate=300",
    registryRef: registry.source.ref,
    etag: true,
    headers: {
      Deprecation: "true",
      Link: "</api/v1/specs>; rel=\"successor-version\""
    }
  });
};

export const config = { path: "/api/registry" };
