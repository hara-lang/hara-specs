import { createHash, randomUUID } from "node:crypto";

export const API_VERSION = "1";
export const DEFAULT_MAX_BODY_BYTES = 1_000_000;

const JSON_CONTENT_TYPE = "application/json; charset=utf-8";
const DEFAULT_ALLOW_HEADERS = "Accept, Content-Type, If-None-Match, X-Request-Id";
const DEFAULT_EXPOSE_HEADERS = "ETag, Link, X-Request-Id, X-Hara-API-Version, X-Hara-Registry-Ref";

export class ApiProblem extends Error {
  constructor({ status = 400, code = "INVALID_REQUEST", message, details = null, headers = {} }) {
    super(message || code);
    this.name = "ApiProblem";
    this.status = status;
    this.code = code;
    this.details = details;
    this.headers = headers;
  }
}

export function apiRequestId(request, context = {}) {
  return context?.requestId || request?.headers?.get?.("x-request-id") || randomUUID();
}

export function entityTag(value) {
  const serialized = typeof value === "string" ? value : JSON.stringify(value);
  return `"${createHash("sha256").update(serialized).digest("base64url")}"`;
}

export function apiHeaders({
  request,
  context = {},
  methods = ["GET", "HEAD", "OPTIONS"],
  cacheControl = "no-store",
  contentType = JSON_CONTENT_TYPE,
  registryRef = null,
  etag = null,
  extra = {}
} = {}) {
  const headers = new Headers({
    "access-control-allow-origin": "*",
    "access-control-allow-methods": [...new Set([...methods, "OPTIONS"])].join(", "),
    "access-control-allow-headers": DEFAULT_ALLOW_HEADERS,
    "access-control-expose-headers": DEFAULT_EXPOSE_HEADERS,
    "access-control-max-age": "86400",
    "cache-control": cacheControl,
    "content-type": contentType,
    "vary": "Accept",
    "x-content-type-options": "nosniff",
    "x-hara-api-version": API_VERSION,
    "x-request-id": apiRequestId(request, context)
  });

  if (registryRef) headers.set("x-hara-registry-ref", registryRef);
  if (etag) headers.set("etag", etag);
  for (const [name, value] of Object.entries(extra || {})) {
    if (value !== undefined && value !== null) headers.set(name, String(value));
  }
  return headers;
}

export function sendJson(request, value, {
  context = {},
  status = 200,
  methods = ["GET", "HEAD", "OPTIONS"],
  cacheControl = "no-store",
  registryRef = null,
  etag = false,
  headers: extraHeaders = {}
} = {}) {
  const serialized = JSON.stringify(value);
  const responseEtag = etag === true ? entityTag(serialized) : etag || null;
  const headers = apiHeaders({
    request,
    context,
    methods,
    cacheControl,
    registryRef,
    etag: responseEtag,
    extra: extraHeaders
  });

  if (
    responseEtag &&
    ["GET", "HEAD"].includes(request.method) &&
    request.headers.get("if-none-match") === responseEtag
  ) {
    headers.delete("content-type");
    return new Response(null, { status: 304, headers });
  }

  return new Response(request.method === "HEAD" ? null : serialized, { status, headers });
}

export function sendEmpty(request, {
  context = {},
  status = 204,
  methods = ["GET", "HEAD", "OPTIONS"],
  cacheControl = "no-store",
  registryRef = null,
  headers: extraHeaders = {}
} = {}) {
  const headers = apiHeaders({
    request,
    context,
    methods,
    cacheControl,
    contentType: "text/plain; charset=utf-8",
    registryRef,
    extra: extraHeaders
  });
  headers.delete("content-type");
  return new Response(null, { status, headers });
}

export function problemResponse(request, problem, { context = {}, methods, registryRef = null } = {}) {
  const normalized = problem instanceof ApiProblem
    ? problem
    : new ApiProblem({
      status: 500,
      code: "INTERNAL_ERROR",
      message: problem instanceof Error ? problem.message : "An unexpected error occurred."
    });

  return sendJson(request, {
    apiVersion: API_VERSION,
    error: {
      code: normalized.code,
      message: normalized.message,
      ...(normalized.details === null ? {} : { details: normalized.details })
    }
  }, {
    context,
    status: normalized.status,
    methods,
    registryRef,
    headers: normalized.headers
  });
}

export function guardMethods(request, context, methods, { registryRef = null } = {}) {
  const allowed = [...new Set(methods)];
  if (request.method === "OPTIONS") {
    return sendEmpty(request, { context, methods: allowed, registryRef });
  }
  if (!allowed.includes(request.method)) {
    return problemResponse(request, new ApiProblem({
      status: 405,
      code: "METHOD_NOT_ALLOWED",
      message: `Use ${allowed.join(" or ")} for this resource.`,
      headers: { Allow: allowed.join(", ") }
    }), { context, methods: allowed, registryRef });
  }
  return null;
}

export async function readJsonBody(request, { maxBytes = DEFAULT_MAX_BODY_BYTES } = {}) {
  const contentType = (request.headers.get("content-type") || "").toLowerCase();
  if (contentType && !contentType.includes("application/json") && !contentType.includes("+json")) {
    throw new ApiProblem({
      status: 415,
      code: "UNSUPPORTED_CONTENT_TYPE",
      message: "Use application/json for this request.",
      details: { received: contentType }
    });
  }

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new ApiProblem({
      status: 413,
      code: "PAYLOAD_TOO_LARGE",
      message: `The request body exceeds the ${maxBytes}-byte limit.`,
      details: { limit: maxBytes, declared: declaredLength }
    });
  }

  const text = await request.text();
  const actualLength = new TextEncoder().encode(text).byteLength;
  if (actualLength > maxBytes) {
    throw new ApiProblem({
      status: 413,
      code: "PAYLOAD_TOO_LARGE",
      message: `The request body exceeds the ${maxBytes}-byte limit.`,
      details: { limit: maxBytes, actual: actualLength }
    });
  }
  if (!text.trim()) {
    throw new ApiProblem({
      status: 400,
      code: "EMPTY_BODY",
      message: "The request body must contain JSON."
    });
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new ApiProblem({
      status: 400,
      code: "INVALID_JSON",
      message: error instanceof Error ? error.message : "The request body is not valid JSON."
    });
  }
}

export function originFor(request) {
  return new URL(request.url).origin;
}

export function absoluteApiUrl(request, path) {
  return new URL(path, originFor(request)).href;
}
