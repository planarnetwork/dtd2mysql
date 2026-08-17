import {defineConfig} from "vitest/config";

export default defineConfig({
  test: {
    name: "@gb-transit/enrich-naptan",
    include: ["src/**/*.spec.ts"]
  }
});
