import registry from "../../src/generated/registry.json";
import {
  API_VERSION,
  ApiProblem,
  absoluteApiUrl,
  apiHeaders,
  guardMethods,
  problemResponse,
  sendJson
} from "../../src/lib/api.mjs";
import {
  contentTypeForPath,
  documentationLocation,
  findSpecification,
  githubBlobUrl,
  immutableSource,
  listSpecifications,
  paginationLinks,
  rawGitHubUrl,
  registryApiLimits,
  registryMetadata,
  sourceLocation
} from "../../src/lib/registry-api.mjs";

const METHODS = ["GET", "HEAD"];

function routeParts(url: URL, context) {
  const prefix = "/api/v1/specs/";
  const tail = url.pathname.startsWith(prefix) ? url.pathname.slice(prefix.length).split("/") : [];
  return {
    identifier: context?.params?.identifier || tail[0] || null,
    representation: tail[1] || null
  };
}

function linkHeader(links) {
  return [
    links.next ? `<${links.next}>; rel="next"` : null,
    links.previous ? `<${links.previous}>; rel="prev"` : null
  ].filter(Boolean).join(", ");
}

async function representationResponse(request: Request, context, spec, representation: "source" | "documentation") {
  const location = representation === "documentation"
    ? documentationLocation(spec, registry.source)
    : sourceLocation(spec, registry.source);
  const rawUrl = rawGitHubUrl(location);
  const blobUrl = githubBlobUrl(location);
  if (!rawUrl || !location?.path) {
    throw new ApiProblem({
      status: 404,
      code: "REPRESENTATION_NOT_FOUND",
      message: `This specification does not declare a ${representation} representation.`
    });
  }

  const url = new URL(request.url);
  if (["1", "true"].includes((url.searchParams.get("redirect") || "").toLowerCase())) {
    const headers = apiHeaders({
      request,
      context,
      methods: METHODS,
      cacheControl: immutableSource(location) ? "public, max-age=31536000, immutable" : "public, max-age=300",
      registryRef: registry.source.ref,
      contentType: contentTypeForPath(location.path),
      extra: {
        Location: rawUrl,
        Link: blobUrl ? `<${blobUrl}>; rel="canonical"` : null,
        "x-hara-source-repository": location.repository,
        "x-hara-source-ref": location.ref,
        "x-hara-source-path": location.path
      }
    });
    headers.delete("content-type");
    return new Response(null, { status: 307, headers });
  }

  let upstream;
  try {
    upstream = await fetch(rawUrl, { method: request.method === "HEAD" ? "HEAD" : "GET", redirect: "follow" });
  } catch (error) {
    throw new ApiProblem({
      status: 502,
      code: "SOURCE_UNAVAILABLE",
      message: error instanceof Error ? error.message : "The source repository could not be reached."
    });
  }

  if (upstream.status === 404) {
    throw new ApiProblem({
      status: 404,
      code: "REPRESENTATION_NOT_FOUND",
      message: `The pinned ${representation} path does not exist at the declared revision.`,
      details: location
    });
  }
  if (!upstream.ok) {
    throw new ApiProblem({
      status: 502,
      code: "SOURCE_UNAVAILABLE",
      message: `The source repository returned ${upstream.status}.`,
      details: { status: upstream.status, location }
    });
  }

  const declaredLength = Number(upstream.headers.get("content-length") || 0);
  if (declaredLength > registryApiLimits.maximumSourceBytes) {
    throw new ApiProblem({
      status: 502,
      code: "SOURCE_TOO_LARGE",
      message: `The representation exceeds the ${registryApiLimits.maximumSourceBytes}-byte proxy limit.`,
      details: { declared: declaredLength, location }
    });
  }

  let body = null;
  let actualLength = declaredLength || null;
  if (request.method !== "HEAD") {
    body = await upstream.arrayBuffer();
    actualLength = body.byteLength;
    if (actualLength > registryApiLimits.maximumSourceBytes) {
      throw new ApiProblem({
        status: 502,
        code: "SOURCE_TOO_LARGE",
        message: `The representation exceeds the ${registryApiLimits.maximumSourceBytes}-byte proxy limit.`,
        details: { actual: actualLength, location }
      });
    }
  }

  const filename = location.path.split("/").pop() || `${spec.slug}.${representation}`;
  const upstreamEtag = upstream.headers.get("etag");
  const headers = apiHeaders({
    request,
    context,
    methods: METHODS,
    cacheControl: immutableSource(location) ? "public, max-age=31536000, immutable" : "public, max-age=300, stale-while-revalidate=1800",
    registryRef: registry.source.ref,
    contentType: contentTypeForPath(location.path),
    etag: upstreamEtag,
    extra: {
      Link: blobUrl ? `<${blobUrl}>; rel="canonical"` : null,
      "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "content-length": actualLength,
      "last-modified": upstream.headers.get("last-modified"),
      "x-hara-source-repository": location.repository,
      "x-hara-source-ref": location.ref,
      "x-hara-source-path": location.path
    }
  });

  if (upstreamEtag && request.headers.get("if-none-match") === upstreamEtag) {
    headers.delete("content-type");
    headers.delete("content-length");
    return new Response(null, { status: 304, headers });
  }
  return new Response(body, { status: 200, headers });
}

export default async (request: Request, context = {}) => {
  const early = guardMethods(request, context, METHODS, { registryRef: registry.source.ref });
  if (early) return early;

  try {
    const url = new URL(request.url);
    const { identifier, representation } = routeParts(url, context);

    if (!identifier) {
      const result = listSpecifications(registry, url.searchParams);
      const links = {
        ...paginationLinks(request.url, result.page),
        capabilities: absoluteApiUrl(request, "/api/v1/capabilities"),
        openapi: absoluteApiUrl(request, "/api/openapi.json")
      };
      return sendJson(request, {
        apiVersion: API_VERSION,
        data: result.items,
        meta: {
          registry: registryMetadata(registry),
          page: result.page,
          filters: result.filters
        },
        links
      }, {
        context,
        methods: METHODS,
        cacheControl: "public, max-age=60, stale-while-revalidate=300",
        registryRef: registry.source.ref,
        etag: true,
        headers: { Link: linkHeader(links) || null }
      });
    }

    const spec = findSpecification(registry, identifier);
    if (!spec) {
      throw new ApiProblem({
        status: 404,
        code: "SPECIFICATION_NOT_FOUND",
        message: `No specification matches ${String(identifier)}.`,
        details: { identifier }
      });
    }

    if (representation === "source" || representation === "documentation") {
      return await representationResponse(request, context, spec, representation);
    }
    if (representation) {
      throw new ApiProblem({
        status: 404,
        code: "RESOURCE_NOT_FOUND",
        message: `Unknown specification representation: ${representation}.`
      });
    }

    const resourcePath = `/api/v1/specs/${encodeURIComponent(spec.slug)}`;
    const source = sourceLocation(spec, registry.source);
    const documentation = documentationLocation(spec, registry.source);
    return sendJson(request, {
      apiVersion: API_VERSION,
      data: spec,
      meta: { registry: registryMetadata(registry) },
      links: {
        self: absoluteApiUrl(request, resourcePath),
        source: absoluteApiUrl(request, `${resourcePath}/source`),
        documentation: absoluteApiUrl(request, `${resourcePath}/documentation`),
        sourceRepository: githubBlobUrl(source),
        documentationRepository: githubBlobUrl(documentation),
        check: absoluteApiUrl(request, `/check?spec=${encodeURIComponent(spec.packageName)}`),
        collection: absoluteApiUrl(request, "/api/v1/specs")
      }
    }, {
      context,
      methods: METHODS,
      cacheControl: "public, max-age=300, stale-while-revalidate=1800",
      registryRef: registry.source.ref,
      etag: true
    });
  } catch (error) {
    return problemResponse(request, error, { context, methods: METHODS, registryRef: registry.source.ref });
  }
};

export const config = {
  path: [
    "/api/v1/specs",
    "/api/v1/specs/:identifier",
    "/api/v1/specs/:identifier/source",
    "/api/v1/specs/:identifier/documentation"
  ]
};
