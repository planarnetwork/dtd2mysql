#!/usr/bin/env node

/**
 * Writes the `{"type": "module"}` marker into the `dist/esm` directory of every
 * workspace library that has one.
 *
 * A package that ships both formats needs one, because node decides a file's
 * module format from the nearest package.json and the workspace's own says
 * CommonJS. Without it the ESM output is loaded as CommonJS, `export` is a
 * syntax error, and - worse - TypeScript reads the ESM declarations in CommonJS
 * mode and reports nothing at all.
 *
 * `tsc` cannot emit a file it was not given, and the root build is `tsc -b`
 * rather than a run of each workspace's build script, so this runs after it.
 * The marker is not committed because `dist/` is gitignored.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import {fileURLToPath} from "node:url";

const libs = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "libs");
const marker = JSON.stringify({type: "module"}, null, 2) + "\n";

export function writeMarkers(root = libs) {
  const written = [];

  for (const lib of fs.readdirSync(root).sort()) {
    const esm = path.join(root, lib, "dist", "esm");

    // only the dual built packages have one, and only once they are built
    if (!fs.existsSync(esm)) {
      continue;
    }

    fs.writeFileSync(path.join(esm, "package.json"), marker);
    written.push(lib);
  }

  return written;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const written = writeMarkers();

  if (written.length > 0) {
    console.log(`Marked as ESM: ${written.join(", ")}`);
  }
}
