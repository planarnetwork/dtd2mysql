import { describe, it, expect } from "vitest";
import {TimeParser} from "./TimeParser.js";

describe("TimeParser", () => {

  it("turns a time string into seconds from midnight", () => {
    const parser = new TimeParser();

    expect(0).toBe(parser.getTime("00:00:00"));
    expect(10).toBe(parser.getTime("00:00:10"));
    expect(130).toBe(parser.getTime("00:02:10"));
    expect(10930).toBe(parser.getTime("03:02:10"));
  });

  it("does not cap the hours at 24", () => {
    const parser = new TimeParser();

    // a call after midnight belongs to the day the trip started
    expect(91800).toBe(parser.getTime("25:30:00"));
  });

  it("accepts a time with no seconds", () => {
    const parser = new TimeParser();

    // seconds are optional in GTFS. This used to read as NaN and say nothing about it.
    expect(36000).toBe(parser.getTime("10:00"));
  });

  it("refuses a time it cannot read", () => {
    const parser = new TimeParser();

    // a blank arrival_time is legitimate GTFS for a stop the feed gives no time for, and this
    // does not handle it - but failing the load says so, where NaN times quietly plan nonsense
    expect(() => parser.getTime("")).toThrow();
    expect(() => parser.getTime("not a time")).toThrow();
  });

  it("caches, and gives the same answer either way", () => {
    const parser = new TimeParser();

    expect(parser.getTime("09:15:00")).toBe(parser.getTime("09:15:00"));
  });

});
