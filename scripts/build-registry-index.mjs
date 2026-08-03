import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRegistryIndex } from "./lib/registry-index.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const checkOnly = process.argv.includes("--check");
const manifestPath = path.join(root, "spec-manifest.json");

async function readManifest() {
  try {
    return JSON.parse(await fs.readFile(manifestPath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return { version: 1, files: [] };
    throw error;
  }
}

const manifest = await readManifest();
const documents = new Map();
for (const file of manifest.files || []) {
  if (file.kind !== "edn") continue;
  try {
    documents.set(file.path, await fs.readFile(path.join(root, file.path), "utf8"));
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

const registry = createRegistryIndex({
  manifest,
  documents,
  repository: process.env.HARA_REGISTRY_REPOSITORY || "hara-lang/hara-specs",
  ref: process.env.COMMIT_REF || "main",
  generatedAt: process.env.BUILD_ID ? new Date().toISOString() : null
});

if (registry.specs.length === 0) {
  console.warn("No registry specs were generated; retaining the committed fallback catalogue.");
  process.exit(0);
}

const moduleContents = `export default ${JSON.stringify(registry, null, 2)};\n`;
const jsonContents = `${JSON.stringify(registry, null, 2)}\n`;
const modulePath = path.join(root, "src/generated/registry.mjs");
const publicDirectory = path.join(root, "public/registry");
const publicPath = path.join(publicDirectory, "index.json");

if (checkOnly) {
  const current = await fs.readFile(modulePath, "utf8").catch(() => "");
  if (current !== moduleContents) {
    console.error("The generated registry index is out of date. Run npm run registry:build.");
    process.exit(1);
  }
  process.exit(0);
}

await fs.mkdir(path.dirname(modulePath), { recursive: true });
await fs.mkdir(publicDirectory, { recursive: true });
await fs.writeFile(modulePath, moduleContents);
await fs.writeFile(publicPath, jsonContents);
console.log(`Indexed ${registry.summary.specifications} specifications and ${registry.summary.requirements} requirements.`);
