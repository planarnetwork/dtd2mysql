import {describe, it, expect} from "vitest";
import {SORT_LIMIT, matching, run} from "./Filter.js";
import {callsTable, tableOf} from "./Table.js";
import {openCalls, openFeed} from "../model/OpenFeed.js";
import {goldenFeed} from "../test/golden.js";

const bytes = goldenFeed();
const feed = await openCalls(await openFeed("golden.zip", bytes), bytes);

const stops = tableOf(feed, "stops.txt")!;
const calls = tableOf(feed, "stop_times.txt")!;

describe("matching", () => {

  it("takes every row when nothing is filtered", () => {
    expect(matching(stops, {}).length).to.equal(345);
  });

  it("matches a substring, case insensitively", () => {
    const rows = matching(stops, {stop_name: "aberdeen"});

    expect(rows.length).to.be.greaterThan(0);
    expect(rows.every(row => stops.value("stop_name", row)?.toLowerCase().includes("aberdeen")))
      .to.equal(true);
  });

  it("narrows on every filter given, not just the last", () => {
    const byName = matching(stops, {stop_name: "aberdeen"});
    const both = matching(stops, {stop_name: "aberdeen", platform_code: "3"});

    expect(both.length).to.be.lessThan(byName.length);
    expect(both.every(row => stops.value("platform_code", row) === "3")).to.equal(true);
  });

  it("returns file order", () => {
    const rows = matching(stops, {stop_name: "a"});

    expect(rows).to.deep.equal([...rows].sort((a, b) => a - b));
  });

  it("matches nothing for a term nothing holds", () => {
    expect(matching(stops, {stop_name: "there is no such station"})).to.deep.equal([]);
  });

  it("ignores a column the file does not have", () => {
    // The general path handles it: every value is undefined, so nothing matches.
    expect(matching(stops, {no_such_column: "x"})).to.deep.equal([]);
  });

  it("filters the calls by trip through the dictionary", () => {
    const rows = matching(calls, {trip_id: "C00049"});

    expect(rows.length).to.be.greaterThan(0);
    expect(rows.every(row => calls.value("trip_id", row)?.includes("C00049"))).to.equal(true);
  });

  it("filters the calls by a column with no dictionary behind it", () => {
    const rows = matching(calls, {stop_sequence: "1"});

    expect(rows.length).to.be.greaterThan(0);
    expect(rows.every(row => calls.value("stop_sequence", row)?.includes("1"))).to.equal(true);
  });

});

describe("run", () => {

  it("pages the rows and says how many matched", () => {
    const page = run(stops, {file: "stops.txt", filters: {}, offset: 0, limit: 10});

    expect(page.rows.length).to.equal(10);
    expect(page.matched).to.equal(345);
    expect(page.total).to.equal(345);
  });

  it("carries the row number each row came from, so a link can name it", () => {
    const page = run(stops, {file: "stops.txt", filters: {}, offset: 7, limit: 3});

    expect(page.rows.map(row => row.index)).to.deep.equal([7, 8, 9]);
    expect(page.rows[0].values.stop_id).to.equal(stops.value("stop_id", 7));
  });

  it("runs off the end without complaining", () => {
    const page = run(stops, {file: "stops.txt", filters: {}, offset: 340, limit: 20});

    expect(page.rows.length).to.equal(5);
    expect(page.matched).to.equal(345);
  });

  it("sorts by a text column", () => {
    const page = run(stops, {file: "stops.txt", filters: {}, sort: "stop_name", offset: 0, limit: 345});
    const names = page.rows.map(row => row.values.stop_name as string);

    expect(names).to.deep.equal([...names].sort((a, b) => a.localeCompare(b)));
  });

  it("sorts a number column as numbers, not as text", () => {
    // Otherwise stop_sequence 10 sorts between 1 and 2, which is the kind of thing that makes a
    // reader distrust everything else on the page.
    const page = run(calls, {
      file: "stop_times.txt", filters: {trip_id: "C00049_20260517_20261206"},
      sort: "stop_sequence", offset: 0, limit: 100
    });
    const sequences = page.rows.map(row => Number(row.values.stop_sequence));

    expect(sequences).to.deep.equal([...sequences].sort((a, b) => a - b));
  });

  it("reverses when asked", () => {
    const up = run(stops, {file: "stops.txt", filters: {}, sort: "stop_name", offset: 0, limit: 5});
    const down = run(stops, {
      file: "stops.txt", filters: {}, sort: "stop_name", descending: true, offset: 0, limit: 5
    });

    expect(down.rows[0].values.stop_name).to.not.equal(up.rows[0].values.stop_name);
  });

  it("sorts a missing value last, both ways round", () => {
    const up = run(stops, {file: "stops.txt", filters: {}, sort: "platform_code", offset: 0, limit: 345});

    expect(up.rows[0].values.platform_code).to.not.equal(undefined);
    expect(up.rows.at(-1)?.values.platform_code).to.equal(undefined);
  });

  it("says the file's columns, including the ones it does not hold", () => {
    const page = run(calls, {file: "stop_times.txt", filters: {}, offset: 0, limit: 1});

    expect(page.notHeld).to.deep.equal(["stop_headsign", "shape_dist_traveled"]);
    expect(page.header).to.contain("trip_id");
    expect(page.header).to.not.contain("stop_headsign");
  });

  it("refuses to sort more rows than anyone will read, and says so", () => {
    const huge = {
      ...callsTable(feed.calls!),
      rows: SORT_LIMIT + 1,
      value: () => "x",
      row: () => ({})
    };
    const page = run(huge, {file: "stop_times.txt", filters: {}, sort: "trip_id", offset: 0, limit: 5});

    expect(page.sortRefused).to.contain("too many to order");
  });

  it("does not mention a refusal when no sort was asked for", () => {
    expect(run(stops, {file: "stops.txt", filters: {}, offset: 0, limit: 5}).sortRefused)
      .to.equal(undefined);
  });

});
