import {defineProject} from "vitest/config";

/**
 * The workflow scripts. Not a package - they are run by CI with node, not
 * imported by anything - but the pruner decides which published releases to
 * delete, and that decision should not be discoverable only by watching it.
 */
export default defineProject({
  test: {
    name: "scripts",
    include: ["*.spec.mjs"]
  }
});
