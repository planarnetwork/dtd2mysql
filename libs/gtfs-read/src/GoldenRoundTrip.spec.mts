import {describe, it, expect} from "vitest";
import {zipSync, strToU8} from "fflate";
import * as fs from "node:fs";
import * as path from "node:path";
import {field} from "@gb-transit/gtfs-output";
import {GTFS_COLUMNS} from "@gb-transit/gtfs-schema";
import {readFeedRows} from "./ReadFeed.js";
import {FeedFileName} from "./FeedFile.js";

/**
 * The feed this repository actually publishes, read back.
 *
 * The unit tests above drive the reader from strings written for it. This drives
 * it from the committed golden - real headsigns with commas in them, real empty
 * columns, real 24:00:00 times - and then writes what it read back out and
 * compares the bytes.
 *
 * That is the property that justifies one schema for both directions: whatever
 * @gb-transit/gtfs writes, this reads, and writing it again produces the same
 * file. A column the reader silently dropped or coerced would fail here.
 */
const GOLDEN = path.join(
  import.meta.dirname, "../../../apps/cif2gtfs/fixtures/mini/golden"
);

const files = fs.readdirSync(GOLDEN)
  .filter(name => name.endsWith(".txt"))
  .sort() as FeedFileName[];

describe("reading the golden feed back", () => {

  it("has files to read", () => {
    expect(files.length).to.be.greaterThan(0);
  });

  it.each(files)("round trips %s", async file => {
    const original = fs.readFileSync(path.join(GOLDEN, file), "utf8");
    const rows = await readFeedRows(zipSync({[file]: strToU8(original)}), [file]);
    const columns = GTFS_COLUMNS[file as keyof typeof GTFS_COLUMNS];

    // Written back exactly as CSVRowWriter would, from the columns the header
    // declared rather than from the schema's full set, so a golden file that
    // omits an optional column is compared against itself.
    const header = original.slice(0, original.indexOf("\n")).split(",");
    const written = header.join(",") + "\n" + rows[file]
      .map((row: object) => header.map(c => field((row as Record<string, unknown>)[c])).join(","))
      .join("\n") + "\n";

    expect(header.every(c => (columns as readonly string[]).includes(c))).to.equal(true);
    expect(written).to.equal(original);
  });

});
