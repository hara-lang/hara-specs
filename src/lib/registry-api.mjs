import { Buffer } from "node:buffer";
import { ApiProblem } from "./api.mjs";

const SHA_PATTERN = /^[0-9a-f]{40}$/i;
const SORT_FIELDS = new Set(["title", "id", "layer", "version"]);
const ORDER_VALUES = new Set(["asc", "desc"]);
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

const encodePath = (value) => String(value || "").split("/").map(encodeURIComponent).join("/");
const optionalFilter = (value) => {
  const normalized = String(value || "").trim();
  return !normalized || normalized === "all" ? null : normalized;
};

function parseBooleanFilter(value, name) {
  const normalized = optionalFilter(value);
  if (normalized === null) return null;
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  throw new ApiProblem({ status: 400, code: "INVALID_FILTER", message: `${name} must be true, false, all, or omitted.`, details: { parameter: name, received: value } });
}

function parsePageSize(value) {
  if (value === null || value === undefined || value === "") return DEFAULT_PAGE_SIZE;
  if (!/^\d+$/.test(String(value))) throw new ApiProblem({ status: 400, code: "INVALID_LIMIT", message: `limit must be an integer between 1 and ${MAX_PAGE_SIZE}.`, details: { received: value, maximum: MAX_PAGE_SIZE } });
  const limit = Number(value);
  if (limit < 1 || limit > MAX_PAGE_SIZE) throw new ApiProblem({ status: 400, code: "INVALID_LIMIT", message: `limit must be an integer between 1 and ${MAX_PAGE_SIZE}.`, details: { received: value, maximum: MAX_PAGE_SIZE } });
  return limit;
}

export function encodeCursor(offset) {
  return Buffer.from(JSON.stringify({ offset }), "utf8").toString("base64url");
}

export function decodeCursor(value) {
  if (!value) return 0;
  try {
    const parsed = JSON.parse(Buffer.from(String(value), "base64url").toString("utf8"));
    if (!Number.isSafeInteger(parsed?.offset) || parsed.offset < 0) throw new Error("invalid offset");
    return parsed.offset;
  } catch {
    throw new ApiProblem({ status: 400, code: "INVALID_CURSOR", message: "cursor is not a valid Hara specifications cursor." });
  }
}

export function registryMetadata(registry) {
  return {
    repository: registry.source.repository,
    requestedRef: registry.source.requestedRef || null,
    ref: registry.source.ref,
    indexPath: registry.source.indexPath || "registry-index.json",
    resolved: registry.source.resolved !== false,
    summary: registry.summary
  };
}

export function specificationIdentifiers(spec) {
  return [spec.id, spec.slug, spec.coordinate, ...(spec.aliases || [])].filter(Boolean);
}

export function findSpecification(registry, identifier) {
  let decoded;
  try { decoded = decodeURIComponent(String(identifier || "")).trim(); }
  catch { decoded = String(identifier || "").trim(); }
  if (!decoded) return null;
  const exact = registry.specs.find((spec) => specificationIdentifiers(spec).includes(decoded));
  if (exact) return exact;
  const normalized = decoded.toLowerCase();
  return registry.specs.find((spec) => specificationIdentifiers(spec).some((candidate) => candidate.toLowerCase() === normalized)) || null;
}

function filterHaystack(spec) {
  return [...specificationIdentifiers(spec), spec.title, spec.summary, spec.owner, spec.classification, spec.layer, spec.type, ...(spec.formats || [])].filter(Boolean).join(" ").toLowerCase();
}

export function listSpecifications(registry, searchParams) {
  const filters = {
    q: optionalFilter(searchParams.get("q"))?.toLowerCase() || null,
    status: optionalFilter(searchParams.get("status")),
    layer: optionalFilter(searchParams.get("layer")),
    owner: optionalFilter(searchParams.get("owner")),
    classification: optionalFilter(searchParams.get("classification")),
    materialization: optionalFilter(searchParams.get("materialization")),
    executable: parseBooleanFilter(searchParams.get("executable"), "executable")
  };
  const sort = optionalFilter(searchParams.get("sort")) || "title";
  const order = optionalFilter(searchParams.get("order")) || "asc";
  if (!SORT_FIELDS.has(sort)) throw new ApiProblem({ status: 400, code: "INVALID_SORT", message: `sort must be one of ${[...SORT_FIELDS].join(", ")}.`, details: { received: sort } });
  if (!ORDER_VALUES.has(order)) throw new ApiProblem({ status: 400, code: "INVALID_ORDER", message: "order must be asc or desc.", details: { received: order } });

  const limit = parsePageSize(searchParams.get("limit"));
  const offset = decodeCursor(searchParams.get("cursor"));
  const filtered = registry.specs.filter((spec) => (
    (!filters.q || filterHaystack(spec).includes(filters.q))
    && (!filters.status || spec.status === filters.status)
    && (!filters.layer || spec.layer === filters.layer)
    && (!filters.owner || spec.owner === filters.owner)
    && (!filters.classification || spec.classification === filters.classification)
    && (!filters.materialization || spec.materialization === filters.materialization)
    && (filters.executable === null || Boolean(spec.executable) === filters.executable)
  ));
  const direction = order === "asc" ? 1 : -1;
  filtered.sort((left, right) => {
    const primary = String(left[sort] || "").localeCompare(String(right[sort] || ""), "en", { sensitivity: "base", numeric: true });
    return primary !== 0 ? primary * direction : String(left.id || "").localeCompare(String(right.id || ""), "en", { sensitivity: "base", numeric: true }) * direction;
  });
  if (offset > filtered.length) throw new ApiProblem({ status: 400, code: "CURSOR_OUT_OF_RANGE", message: "cursor points beyond the end of this result set.", details: { offset, total: filtered.length } });
  const items = filtered.slice(offset, offset + limit);
  const nextOffset = offset + items.length;
  return {
    items,
    filters: { ...filters, sort, order },
    page: { limit, offset, returned: items.length, total: filtered.length, nextCursor: nextOffset < filtered.length ? encodeCursor(nextOffset) : null, previousCursor: offset > 0 ? encodeCursor(Math.max(0, offset - limit)) : null }
  };
}

export function paginationLinks(requestUrl, page) {
  const self = new URL(requestUrl);
  const withCursor = (cursor) => {
    if (!cursor) return null;
    const url = new URL(self); url.searchParams.set("cursor", cursor); return url.href;
  };
  return { self: self.href, next: withCursor(page.nextCursor), previous: withCursor(page.previousCursor) };
}

export function sourceLocation(spec, registrySource) {
  return spec.source || { repository: registrySource.repository, ref: registrySource.ref, path: spec.sourcePath };
}
export function documentationLocation(spec, registrySource) {
  return spec.documentation || { repository: registrySource.repository, ref: registrySource.ref, path: spec.documentationPath };
}
export function githubBlobUrl(location) {
  if (!location?.repository || !location?.ref || !location?.path) return null;
  return `https://github.com/${location.repository}/blob/${encodeURIComponent(location.ref)}/${encodePath(location.path)}`;
}
export function rawGitHubUrl(location) {
  if (!location?.repository || !location?.ref || !location?.path) return null;
  return `https://raw.githubusercontent.com/${location.repository}/${encodeURIComponent(location.ref)}/${encodePath(location.path)}`;
}
export function contentTypeForPath(path) {
  const normalized = String(path || "").toLowerCase();
  if (normalized.endsWith(".json")) return "application/json; charset=utf-8";
  if (normalized.endsWith(".edn")) return "application/edn; charset=utf-8";
  if (normalized.endsWith(".md") || normalized.endsWith(".markdown")) return "text/markdown; charset=utf-8";
  if (normalized.endsWith(".yaml") || normalized.endsWith(".yml")) return "application/yaml; charset=utf-8";
  if (normalized.endsWith(".hal")) return "text/x-hara; charset=utf-8";
  return "text/plain; charset=utf-8";
}
export function immutableSource(location) { return SHA_PATTERN.test(location?.ref || ""); }
export const registryApiLimits = { defaultPageSize: DEFAULT_PAGE_SIZE, maximumPageSize: MAX_PAGE_SIZE, maximumSourceBytes: 5_000_000 };
