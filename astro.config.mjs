import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://specs.hara-lang.org",
  output: "static",
  trailingSlash: "never",
  build: {
    format: "directory"
  }
});
