import {defineConfig} from "vitest/config";

export default defineConfig({
  test: {
    name: "@gb-transit/extend-station-groups",
    include: ["src/**/*.spec.ts"]
  }
});
