import {defineConfig} from "vitest/config";

// One vitest run covers every workspace. Each package owns its own
// vitest.config.ts so a failure is attributed to a package rather than to the
// repository as a whole.
//
// The inline "dtd2mysql" project below covers the tests that have not been
// moved into a package yet. It disappears once test/ is empty.
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "dtd2mysql",
          root: import.meta.dirname,
          include: ["test/**/*.spec.ts"]
        }
      },
      "libs/*",
      "apps/*"
    ]
  }
});
