const SHA_PATTERN = /^[0-9a-f]{40}$/i;
const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

export const DEFAULT_REGISTRY_REPOSITORY = "hara-lang/hara-specs-registry";
export const DEFAULT_REGISTRY_REF = "main";
export const DEFAULT_REGISTRY_INDEX_PATH = "registry-index.json";

const encodePath = (value) => String(value).split("/").map(encodeURIComponent).join("/");

export function registryConfig(environment = process.env) {
  const repository = environment.HARA_REGISTRY_REPOSITORY || DEFAULT_REGISTRY_REPOSITORY;
  const ref = environment.HARA_REGISTRY_REF || DEFAULT_REGISTRY_REF;
  const indexPath = environment.HARA_REGISTRY_INDEX_PATH || DEFAULT_REGISTRY_INDEX_PATH;
  if (!REPOSITORY_PATTERN.test(repository)) throw new Error(`Invalid HARA_REGISTRY_REPOSITORY: ${repository}`);
  if (!ref || ref.includes("\0")) throw new Error("HARA_REGISTRY_REF must be non-empty.");
  if (!indexPath || indexPath.startsWith("/") || indexPath.includes("..") || indexPath.includes("\\")) throw new Error(`Invalid HARA_REGISTRY_INDEX_PATH: ${indexPath}`);
  return {
    repository,
    ref,
    indexPath,
    token: environment.HARA_GITHUB_TOKEN || environment.GITHUB_TOKEN || null
  };
}

const githubHeaders = (token, accept = "application/vnd.github+json") => ({
  Accept: accept,
  "User-Agent": "hara-specs-service",
  ...(token ? { Authorization: `Bearer ${token}` } : {})
});

export function validateRegistryIndex(index, { repository = DEFAULT_REGISTRY_REPOSITORY } = {}) {
  const problems = [];
  if (!index || typeof index !== "object" || Array.isArray(index)) problems.push("index must be an object");
  if (index?.schemaVersion !== 2) problems.push("schemaVersion must be 2");
  if (index?.source?.repository !== repository) problems.push(`source.repository must be ${repository}`);
  if (index?.source?.transitional !== false) problems.push("source.transitional must be false");
  if (!Array.isArray(index?.specs)) problems.push("specs must be an array");
  if (!index?.summary || typeof index.summary !== "object") problems.push("summary must be an object");

  const ids = new Set();
  const slugs = new Set();
  for (const spec of index?.specs || []) {
    if (!spec?.id || ids.has(spec.id)) problems.push(`spec id is missing or duplicated: ${spec?.id || "<missing>"}`);
    else ids.add(spec.id);
    if (!spec?.slug || slugs.has(spec.slug)) problems.push(`spec slug is missing or duplicated: ${spec?.slug || "<missing>"}`);
    else slugs.add(spec.slug);
    if (!spec?.source?.repository || !spec?.source?.ref || !spec?.source?.path) problems.push(`${spec?.id || "spec"} has an incomplete source location`);
  }

  if (index?.summary?.specifications !== (index?.specs || []).length) problems.push("summary.specifications does not match specs.length");
  if (problems.length) throw new Error(`Invalid Hara registry index:\n- ${problems.join("\n- ")}`);
  return index;
}

export async function resolveRegistryRef({ repository, ref, fetchImpl = globalThis.fetch, token = null }) {
  if (SHA_PATTERN.test(ref)) return ref.toLowerCase();
  if (typeof fetchImpl !== "function") throw new Error("A fetch implementation is required to resolve the registry ref.");
  const response = await fetchImpl(`https://api.github.com/repos/${repository}/commits/${encodeURIComponent(ref)}`, {
    headers: githubHeaders(token)
  });
  if (!response.ok) throw new Error(`Unable to resolve ${repository}@${ref}: GitHub returned ${response.status}.`);
  const result = await response.json();
  if (!SHA_PATTERN.test(result?.sha || "")) throw new Error(`GitHub did not return a commit SHA for ${repository}@${ref}.`);
  return result.sha.toLowerCase();
}

function pinLocation(location, { repository, requestedRef, resolvedRef }) {
  if (!location || location.repository !== repository) return location;
  if (SHA_PATTERN.test(location.ref || "")) return location;
  return {
    ...location,
    requestedRef: location.ref || requestedRef,
    ref: resolvedRef
  };
}

export function pinRegistryIndex(index, { repository, requestedRef, resolvedRef, indexPath }) {
  validateRegistryIndex(index, { repository });
  const registryRef = index.source.ref || requestedRef;
  return {
    ...index,
    source: {
      ...index.source,
      repository,
      requestedRef,
      ref: resolvedRef,
      indexPath,
      resolved: true
    },
    specs: index.specs.map((spec) => ({
      ...spec,
      source: pinLocation(spec.source || {
        repository,
        ref: registryRef,
        path: spec.sourcePath
      }, { repository, requestedRef, resolvedRef }),
      documentation: pinLocation(spec.documentation || {
        repository,
        ref: registryRef,
        path: spec.documentationPath
      }, { repository, requestedRef, resolvedRef })
    }))
  };
}

export async function fetchRegistryIndex({
  repository = DEFAULT_REGISTRY_REPOSITORY,
  ref = DEFAULT_REGISTRY_REF,
  indexPath = DEFAULT_REGISTRY_INDEX_PATH,
  fetchImpl = globalThis.fetch,
  token = null
} = {}) {
  const resolvedRef = await resolveRegistryRef({ repository, ref, fetchImpl, token });
  const response = await fetchImpl(`https://raw.githubusercontent.com/${repository}/${resolvedRef}/${encodePath(indexPath)}`, {
    headers: githubHeaders(token, "application/json")
  });
  if (!response.ok) throw new Error(`Unable to fetch ${repository}@${resolvedRef}/${indexPath}: GitHub returned ${response.status}.`);
  let index;
  try {
    index = JSON.parse(await response.text());
  } catch (error) {
    throw new Error(`The registry index is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  return pinRegistryIndex(index, { repository, requestedRef: ref, resolvedRef, indexPath });
}

export const isCommitSha = (value) => SHA_PATTERN.test(value || "");
