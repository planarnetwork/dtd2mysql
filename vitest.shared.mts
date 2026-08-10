import {defineProject} from "vitest/config";

/**
 * Every workspace gets the same vitest project shape, named after the package so
 * a failure is attributed to a package rather than to the repository.
 */
export function project(name: string) {
  return defineProject({
    test: {
      name,
      include: ["src/**/*.spec.ts"]
    }
  });
}
