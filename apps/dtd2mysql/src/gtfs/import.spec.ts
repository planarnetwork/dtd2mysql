import {describe, it, expect} from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {importSQL} from "./import";
import {schema} from "./schema";

/**
 * The loader has to agree with the feed the build writes, and nothing else says
 * so. LOAD DATA matches fields to columns by position, so a column list written
 * from the table rather than from the file loads every field into the wrong
 * column and reports nothing - which is what `stops.txt` did until the ATCO
 * codes landed and somebody looked.
 *
 * The golden feed belongs to dtd2gtfs, which is the only committed example of
 * what this build produces. Reading it across the workspace is the point: the
 * two have to match.
 */
const golden = path.join(__dirname, "..", "..", "..", "dtd2gtfs", "fixtures", "mini", "golden");

/**
 * The files LOAD DATA reads, and the columns each statement gives them. A
 * statement with no column list loads the file in the table's own order.
 */
function loads(): Map<string, string[] | null> {
  const statements = /LOAD DATA LOCAL INFILE '([a-z_]+\.txt)' INTO TABLE (\w+)\s*(?:FIELDS[^(;]*\(([^)]*)\))?/g;

  return new Map([...importSQL.matchAll(statements)].map(([, file, , columns]) => [
    file,
    columns === undefined ? null : columns.split(",").map(column => column.trim().replace(/^@/, ""))
  ]));
}

/**
 * The columns a CREATE TABLE declares, in the order it declares them.
 */
function columnsOf(table: string): string[] {
  const body = schema.match(new RegExp(`CREATE TABLE ${table} \\(([\\s\\S]*?)\\n\\) ENGINE`))![1];

  return body
    .split("\n")
    .map(line => line.trim())
    .filter(line => /^[a-z_]+ /.test(line) && !line.startsWith("--"))
    .map(line => line.split(" ")[0]);
}

const header = (file: string) => fs.readFileSync(path.join(golden, file), "utf8").split("\n")[0].split(",");

describe("the GTFS import", () => {

  it("reads every file the build writes, and no others", () => {
    const written = fs.readdirSync(golden).filter(file => file.endsWith(".txt")).sort();

    expect([...loads().keys()].sort()).to.deep.equal(written);
  });

  for (const [file, columns] of loads()) {
    it(`loads ${file} into the columns its fields actually are`, () => {
      expect(columns ?? columnsOf(file.replace(".txt", ""))).to.deep.equal(header(file));
    });
  }

  it("declares a column for every field, so nothing is silently truncated", () => {
    for (const [file] of loads()) {
      const table = file.replace(".txt", "");

      expect(columnsOf(table).slice().sort(), table).to.deep.equal(header(file).slice().sort());
    }
  });

  it("creates no table nothing loads into", () => {
    const tables = [...schema.matchAll(/CREATE TABLE (\w+) \(/g)].map(([, table]) => table);
    const loaded = new Set([...loads().keys()].map(file => file.replace(".txt", "")));

    // shapes has no file: GTFS defines it and this feed has no geometry to put
    // in it, so it is created empty rather than left out of the schema.
    expect(tables.filter(table => !loaded.has(table))).to.deep.equal(["shapes"]);
  });

});
