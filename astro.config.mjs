import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://specs.hara-lang.io",
  output: "static",
  trailingSlash: "never",
  build: {
    format: "directory"
  }
});
