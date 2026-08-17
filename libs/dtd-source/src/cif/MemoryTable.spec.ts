import {describe, it, expect} from "vitest";
import {FixedWidthRecord, RecordAction, TextField, VariableLengthText} from "@gb-transit/feed-parser";
import {charColumns, MemoryTable} from "./MemoryTable";

const record = new FixedWidthRecord(
  "thing",
  ["code"],
  {
    "code": new TextField(0, 3),
    "name": new TextField(3, 10),
    "note": new VariableLengthText(13, 10, true)
  },
  [],
  {"N": RecordAction.Insert, "R": RecordAction.Update, "D": RecordAction.Delete},
  23
);

const row = (code: string, name: string, action = "N") =>
  record.extractValues(`${code}${name.padEnd(10)}${"note".padEnd(10)}${action}`);

describe("MemoryTable", () => {

  it("gives a row an id when the record does not supply one", () => {
    const table = new MemoryTable(record);

    table.apply(row("AAA", "first"));
    table.apply(row("BBB", "second"));

    expect(table.rows.map(r => r.id)).to.deep.equal([1, 2]);
  });

  it("ignores a duplicate insert, as INSERT IGNORE does", () => {
    const table = new MemoryTable(record);

    table.apply(row("AAA", "first"));
    table.apply(row("AAA", "second"));

    expect(table.rows.length).to.equal(1);
    expect(table.rows[0].name).to.equal("first");
  });

  it("replaces a row on a revision, as REPLACE INTO does", () => {
    const table = new MemoryTable(record);

    table.apply(row("AAA", "first"));
    table.apply(row("AAA", "second", "R"));

    expect(table.rows.length).to.equal(1);
    expect(table.rows[0].name).to.equal("second");
    // REPLACE is a delete and an insert, so the row takes a new id
    expect(table.rows[0].id).to.equal(2);
  });

  it("removes a row on a delete", () => {
    const table = new MemoryTable(record);

    table.apply(row("AAA", "first"));
    table.apply(row("AAA", "first", "D"));

    expect(table.rows).to.deep.equal([]);
  });

  it("looks a row up by its key", () => {
    const table = new MemoryTable(record);

    table.apply(row("AAA", "first"));

    expect(table.get("AAA")!.name).to.equal("first");
    expect(table.get("ZZZ")).to.equal(undefined);
  });

  it("accumulates rows for a record with no key, which is why ALF triples", () => {
    const unkeyed = new FixedWidthRecord("thing", [], {"code": new TextField(0, 3)});
    const table = new MemoryTable(unkeyed);

    table.apply(unkeyed.extractValues("AAA"));
    table.apply(unkeyed.extractValues("AAA"));

    expect(table.rows.length).to.equal(2);
  });

});

describe("charColumns", () => {

  it("strips the trailing spaces a CHAR column would lose", () => {
    const values = charColumns(record, {code: "AAA", name: "first     ", note: null});

    expect(values.name).to.equal("first");
  });

  it("keeps the trailing spaces a VARCHAR column would keep", () => {
    // Stop activities are VARCHAR and are read two characters at a time, so
    // "T " has to survive
    const values = charColumns(record, {code: "AAA", name: "first", note: "T "});

    expect(values.note).to.equal("T ");
  });

  it("leaves nulls and numbers alone", () => {
    const values = charColumns(record, {code: "AAA", name: null, note: 12 as never});

    expect(values.name).to.equal(null);
    expect(values.note).to.equal(12);
  });

});
