import {defineConfig} from "vitest/config";

export default defineConfig({
  test: {
    name: "@gb-rail/enrich-naptan",
    include: ["src/**/*.spec.ts"]
  }
});
