import {describe, it, expect} from "vitest";
import {CSVParser} from "@gb-transit/gtfs-loader";
import type {Row} from "@gb-transit/gtfs-loader";
import {toCSV, toJSON} from "./Export.js";
import {run} from "./Filter.js";
import type {Page} from "./Filter.js";
import {tableOf} from "./Table.js";
import {openCalls, openFeed} from "../model/OpenFeed.js";
import {goldenFeed} from "../test/golden.js";

const bytes = goldenFeed();
const feed = await openCalls(await openFeed("golden.zip", bytes), bytes);

function page(rows: {index: number, values: Row}[], header: string[]): Page {
  return {file: "test.txt", header, notHeld: [], rows, matched: rows.length, total: rows.length, offset: 0};
}

/** Read text back the way the explorer reads a feed, so the round trip is the real one. */
function parse(text: string, header: string[]): Row[] {
  const rows: Row[] = [];
  const parser = new CSVParser(header, row => rows.push({...row}));

  parser.write(text);
  parser.end();

  return rows;
}

describe("toCSV", () => {

  it("writes the header and the rows", () => {
    const csv = toCSV(page([{index: 0, values: {stop_id: "MAN", stop_name: "Manchester"}}],
      ["stop_id", "stop_name"]));

    expect(csv).to.equal("stop_id,stop_name\nMAN,Manchester\n");
  });

  it("writes an absent value as an empty field, not as the word undefined", () => {
    const csv = toCSV(page([{index: 0, values: {stop_id: "MAN", platform_code: undefined}}],
      ["stop_id", "platform_code"]));

    expect(csv).to.equal("stop_id,platform_code\nMAN,\n");
  });

  it("quotes a value holding a comma", () => {
    // stop_headsign is the only field in a GB feed that has one - a dividing train - and an export
    // that wrote it bare would put an extra column on that row alone.
    const csv = toCSV(page([{index: 0, values: {stop_headsign: "Portsmouth Harbour, Southampton"}}],
      ["stop_headsign"]));

    expect(csv).to.equal("stop_headsign\n\"Portsmouth Harbour, Southampton\"\n");
  });

  it("doubles a quote inside a value", () => {
    const csv = toCSV(page([{index: 0, values: {stop_name: "The \"Flying\" Scotsman"}}], ["stop_name"]));

    expect(parse(csv, ["stop_name"])[0].stop_name).to.equal("The \"Flying\" Scotsman");
  });

  it("round trips a headsign with a comma back through the feed reader", () => {
    const values = {trip_id: "T1", stop_headsign: "Portsmouth Harbour, Southampton"};
    const csv = toCSV(page([{index: 0, values}], ["trip_id", "stop_headsign"]));

    expect(parse(csv, ["trip_id", "stop_headsign"])).to.deep.equal([values]);
  });

  it("round trips a real filtered view of the golden feed", () => {
    const stops = tableOf(feed, "stops.txt")!;
    const result = run(stops, {file: "stops.txt", filters: {stop_name: "aberdeen"}, offset: 0, limit: 50});
    const read = parse(toCSV(result), [...result.header]);

    expect(read.length).to.equal(result.rows.length);
    expect(read[0]).to.deep.equal(result.rows[0].values);
  });

});

describe("toJSON", () => {

  it("carries the row number each row came from", () => {
    // Which is what a finding is cited by, and what the CSV cannot say without inventing a column.
    const json = JSON.parse(toJSON(page([{index: 7, values: {stop_id: "MAN"}}], ["stop_id"])));

    expect(json.rows[0]).to.deep.equal({csvRowNumber: 9, stop_id: "MAN"});
  });

  it("says how many matched as well as how many are here", () => {
    const json = JSON.parse(toJSON({
      ...page([{index: 0, values: {stop_id: "MAN"}}], ["stop_id"]),
      matched: 9,
      total: 345
    }));

    expect(json).to.contain({file: "test.txt", matched: 9, total: 345});
  });

});
