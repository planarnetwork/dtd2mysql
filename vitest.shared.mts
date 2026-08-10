import {defineProject} from "vitest/config";

/**
 * Every workspace gets the same vitest project shape, named after the package so
 * a failure is attributed to a package rather than to the repository.
 */
export function project(name: string) {
  return defineProject({
    test: {
      name,
      // .mts for a test that needs import.meta, which a package emitting
      // CommonJS cannot use in a .ts file
      include: ["src/**/*.spec.ts", "src/**/*.spec.mts"]
    }
  });
}
