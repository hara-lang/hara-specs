import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchRegistryIndex, registryConfig } from "./lib/registry-source.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const checkOnly = process.argv.includes("--check");
const snapshotPath = path.join(root, "src/generated/registry.json");
const publicDirectory = path.join(root, "public/registry");
const publicPath = path.join(publicDirectory, "index.json");
const config = registryConfig();

const registry = await fetchRegistryIndex(config);
console.log(`Resolved ${config.repository}@${config.ref} to ${registry.source.ref}.`);

const jsonContents = `${JSON.stringify(registry, null, 2)}\n`;

if (checkOnly) {
  const [currentSnapshot, currentPublic] = await Promise.all([
    fs.readFile(snapshotPath, "utf8").catch(() => ""),
    fs.readFile(publicPath, "utf8").catch(() => "")
  ]);
  if (currentSnapshot !== jsonContents || currentPublic !== jsonContents) {
    console.error("The generated external registry outputs are missing or out of date. Run npm run registry:build.");
    process.exit(1);
  }
  console.log(`The generated registry outputs match ${registry.source.repository}@${registry.source.ref}.`);
  process.exit(0);
}

await fs.mkdir(path.dirname(snapshotPath), { recursive: true });
await fs.mkdir(publicDirectory, { recursive: true });
await Promise.all([
  fs.writeFile(snapshotPath, jsonContents),
  fs.writeFile(publicPath, jsonContents)
]);
console.log(`Loaded ${registry.summary.specifications} specifications and ${registry.summary.requirements} requirements from the external registry.`);
