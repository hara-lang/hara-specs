import registry from "../../src/generated/registry.mjs";

export default async (request: Request) => {
  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
  }

  const url = new URL(request.url);
  const query = (url.searchParams.get("q") || "").trim().toLowerCase();
  const status = url.searchParams.get("status");
  const layer = url.searchParams.get("layer");
  const specs = registry.specs.filter((spec) => {
    const haystack = `${spec.packageName} ${spec.title} ${spec.summary} ${spec.owner}`.toLowerCase();
    return (!query || haystack.includes(query)) && (!status || status === "all" || spec.status === status) && (!layer || layer === "all" || spec.layer === layer);
  });

  return Response.json({ ...registry, summary: { ...registry.summary, returned: specs.length }, specs }, {
    headers: { "cache-control": "public, max-age=60, stale-while-revalidate=300" }
  });
};

export const config = { path: "/api/registry" };
