import {describe, it, expect} from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {zipSync, strToU8} from "fflate";
import {field} from "@gb-transit/gtfs-output";
import {readFeedRows, FeedFileName} from "@gb-transit/gtfs-read";
import {GTFS_COLUMNS} from "@gb-transit/gtfs-schema";

/**
 * Every feed this repository commits, read back and written out again.
 *
 * The rail feed with its multi-destination headsigns and 24:00:00 times, the bus
 * feed with its shapes and block ids and a route type the rail feed never
 * writes, and the merge of them with both.
 *
 * The property is that the reader and the writer agree about the schema, which
 * is the entire justification for them sharing one. A column the reader dropped,
 * or a value it coerced into something that serialises differently, fails here.
 */
const goldens = [
  ["rail", path.join(import.meta.dirname, "../../apps/cif2gtfs/fixtures/mini/golden")],
  ["bus", path.join(import.meta.dirname, "../../apps/transxchange2gtfs/fixtures/mini/golden")],
  ["merged", path.join(import.meta.dirname, "../../apps/gtfsmerge/fixtures/tiny/golden")]
] as const;

describe.each(goldens)("the %s golden", (_name, directory) => {

  const files = fs.readdirSync(directory).filter(f => f.endsWith(".txt")).sort();

  it("has files to read", () => {
    expect(files.length).to.be.greaterThan(0);
  });

  it.each(files)("round trips %s", async file => {
    const original = fs.readFileSync(path.join(directory, file), "utf8");
    const rows = await readFeedRows(
      zipSync({[file]: strToU8(original)}), [file as FeedFileName]
    );

    // Written back from the columns the header declared, so a file that omits an
    // optional column is compared against itself.
    const header = original.slice(0, original.indexOf("\n")).split(",");
    const known = GTFS_COLUMNS[file as keyof typeof GTFS_COLUMNS] as readonly string[];

    // Nothing may be written under a column the schema has never heard of.
    expect(header.every(column => known.includes(column))).to.equal(true);

    const written = header.join(",") + "\n" + rows[file as FeedFileName]
      .map((row: object) => header.map(c => field((row as Record<string, unknown>)[c])).join(","))
      .join("\n") + "\n";

    expect(written).to.equal(original);
  });

});
