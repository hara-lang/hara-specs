import path from "node:path";

const unescapeEdnString = (value) => value
  .replace(/\\n/g, "\n")
  .replace(/\\r/g, "\r")
  .replace(/\\t/g, "\t")
  .replace(/\\\"/g, '"')
  .replace(/\\\\/g, "\\");

const captureString = (source, key) => {
  const expression = new RegExp(`${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+\"((?:[^\"\\\\]|\\\\.)*)\"`);
  const match = source.match(expression);
  return match ? unescapeEdnString(match[1]) : null;
};

const captureKeyword = (source, key) => {
  const expression = new RegExp(`${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+:([^\\s,}\\]\\)]+)`);
  return source.match(expression)?.[1] ?? null;
};

const slugify = (value) => value
  .replace(/^@/, "")
  .replace(/[/:._]+/g, "-")
  .replace(/[^a-zA-Z0-9-]+/g, "-")
  .replace(/^-+|-+$/g, "")
  .toLowerCase();

const titleFromPath = (filePath) => path.basename(filePath, path.extname(filePath))
  .replace(/[-_]+/g, " ")
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

export function parseSpecDocument(source, file) {
  const id = captureKeyword(source, ":document/id") || captureKeyword(source, ":spec/id");
  const title = captureString(source, ":document/title") || captureString(source, ":spec/title") || titleFromPath(file.path);
  const summary = captureString(source, ":document/summary") || captureString(source, ":spec/summary") || "No summary has been published for this specification.";
  const version = captureString(source, ":document/version") || captureString(source, ":spec/version") || "0.0.0-draft";
  const status = captureKeyword(source, ":document/status") || captureKeyword(source, ":spec/status") || (file.path.includes("/ready/") ? "ready" : file.path.includes("/draft/") ? "draft" : "unclassified");
  const type = captureKeyword(source, ":document/type") || captureKeyword(source, ":spec/type") || "specification";
  const notationExtension = captureString(source, ":notation/extension");
  const requirements = (source.match(/:requirement\/id\b/g) || []).length;
  const stableId = id || file.path.replace(/\.[^.]+$/, "");
  const slug = slugify(stableId);
  const directory = path.posix.dirname(file.path);

  return {
    id: stableId,
    slug,
    packageName: `@hara/${slug}`,
    title,
    summary,
    type,
    version,
    status,
    layer: file.path.split("/")[0] || "root",
    owner: file.owner || "hara-lang",
    classification: file.classification || "hara",
    sourcePath: file.path,
    documentationPath: `${directory}/README.md`,
    requirements,
    formats: [notationExtension === ".json" ? "application/json" : notationExtension === ".xml" ? "application/xml" : "application/edn"],
    executable: requirements > 0
  };
}

export function createRegistryIndex({ manifest, documents, repository = "hara-lang/hara-specs", ref = "main", generatedAt = null }) {
  const seen = new Map();
  const specs = [];

  for (const file of manifest.files || []) {
    if (file.kind !== "edn") continue;
    if (!/(?:^|\/)(?:draft|ready|metaspec)(?:\/|$)/.test(file.path)) continue;
    const source = documents.get(file.path);
    if (!source) continue;
    const spec = parseSpecDocument(source, file);
    const count = seen.get(spec.slug) || 0;
    seen.set(spec.slug, count + 1);
    if (count) spec.slug = `${spec.slug}-${count + 1}`;
    specs.push(spec);
  }

  specs.sort((left, right) => left.layer.localeCompare(right.layer) || left.title.localeCompare(right.title));

  return {
    schemaVersion: 1,
    generatedAt,
    source: {
      repository,
      targetRepository: "hara-lang/hara-specs-registry",
      ref,
      transitional: repository !== "hara-lang/hara-specs-registry"
    },
    summary: {
      specifications: specs.length,
      draft: specs.filter(({ status }) => status === "draft").length,
      ready: specs.filter(({ status }) => status === "ready").length,
      executable: specs.filter(({ executable }) => executable).length,
      requirements: specs.reduce((total, { requirements }) => total + requirements, 0)
    },
    specs
  };
}
