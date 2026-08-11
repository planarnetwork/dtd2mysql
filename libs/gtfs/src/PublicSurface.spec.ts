import {describe, it, expect} from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * What the workspace libraries export, pinned.
 *
 * `dtd2mysql` is bundled and ships no `types`, so it has no type surface of its
 * own. These do: enrichers are written as separate packages against `libs/gtfs`,
 * which makes a renamed export somebody else's build breaking.
 *
 * So a removed or renamed export is a decision, recorded here, rather than a
 * side effect of tidying an import.
 */
const libs = path.join(__dirname, "..", "..");
// Not inside libs/: the root vitest config globs libs/* as projects, and a JSON
// file there stops the runner before any test loads.
const snapshotFile = path.join(libs, "..", "type-surface.json");

function surface(): {[lib: string]: string[]} {
  const result: {[lib: string]: string[]} = {};

  for (const lib of fs.readdirSync(libs).sort()) {
    const declaration = path.join(libs, lib, "dist", "index.d.ts");

    if (!fs.existsSync(declaration)) {
      continue;
    }

    const names = [...fs.readFileSync(declaration, "utf8")
      .matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/g)]
      .flatMap(match => match[1].split(","))
      .map(name => name.trim().split(/\s+as\s+/).pop()!.trim())
      .filter(name => name.length > 0);

    result[lib] = [...new Set(names)].sort();
  }

  return result;
}

describe("the public surface of the libraries", () => {

  const current = surface();

  it("has been built, so there is something to check", () => {
    // dist is what a consumer resolves, so the snapshot is taken from there
    // rather than from the source. `yarn build` first if this fails.
    expect(Object.keys(current).length).to.be.greaterThan(0);
  });

  it("matches the committed snapshot", () => {
    if (process.env.UPDATE_SURFACE) {
      fs.writeFileSync(snapshotFile, JSON.stringify(current, null, 2) + "\n");
    }

    const committed = JSON.parse(fs.readFileSync(snapshotFile, "utf8"));

    expect(current).to.deep.equal(committed);
  });

});
