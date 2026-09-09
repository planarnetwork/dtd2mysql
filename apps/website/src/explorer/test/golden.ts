import * as fs from "node:fs";
import * as path from "node:path";
import {zipSync} from "fflate";

/**
 * The golden feed cif2gtfs is held to, zipped in memory.
 *
 * A committed zip would be a binary that drifts from the fixture it was made of. Zipping the
 * directory on the way into each test exercises the real path - a zip, read by readZip, parsed by
 * CSVParser - against a feed that already carries every shape the explorer has to handle: times past
 * midnight, a quoted headsign, split and join transfers, stations with boarding points under them,
 * and two calendars nothing runs on.
 */
const GOLDEN = path.join(
  import.meta.dirname, "..", "..", "..", "..", "..", "apps", "cif2gtfs", "fixtures", "mini", "golden"
);

export function goldenFeed(): Uint8Array {
  const files: Record<string, Uint8Array> = {};

  for (const name of fs.readdirSync(GOLDEN).sort()) {
    if (name.endsWith(".txt")) {
      files[name] = new Uint8Array(fs.readFileSync(path.join(GOLDEN, name)));
    }
  }

  return zipSync(files);
}

/**
 * The same feed with one file replaced, for the non-zero case of a check.
 *
 * Every check has to be shown finding something as well as finding nothing, and hand-breaking a real
 * feed is a better test than hand-writing a small one: the break is the only thing that differs from
 * a feed known to be sound.
 */
export function brokenFeed(edits: Record<string, (text: string) => string>): Uint8Array {
  const files: Record<string, Uint8Array> = {};

  for (const name of fs.readdirSync(GOLDEN).sort()) {
    if (!name.endsWith(".txt")) {
      continue;
    }

    const text = fs.readFileSync(path.join(GOLDEN, name), "utf8");

    files[name] = new TextEncoder().encode(edits[name] === undefined ? text : edits[name](text));
  }

  return zipSync(files);
}
