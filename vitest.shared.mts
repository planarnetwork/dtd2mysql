import {defineProject} from "vitest/config";

/**
 * Every workspace gets the same vitest project shape, named after the package so
 * a failure is attributed to a package rather than to the repository.
 *
 * `@gb-rail/*` packages resolve to their TypeScript source (see the `exports`
 * field in each manifest), so tests run against source and do not need a build.
 * Inlining them keeps vite from trying to externalise a workspace symlink.
 */
export function project(name: string) {
  return defineProject({
    test: {
      name,
      include: ["test/**/*.spec.ts"],
      server: {
        deps: {
          inline: [/^@gb-rail\//]
        }
      }
    }
  });
}
