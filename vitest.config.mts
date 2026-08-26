import {defineConfig} from "vitest/config";

// One vitest run covers every workspace. Each package owns its own
// vitest.config.mts so a failure is attributed to a package rather than to the
// repository as a whole.
export default defineConfig({
  test: {
    projects: [
      "libs/*",
      "apps/*",
      "scripts"
    ]
  }
});
