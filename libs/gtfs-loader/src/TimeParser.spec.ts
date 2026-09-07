import { describe, it, expect } from "vitest";
import {TimeParser} from "./TimeParser.js";

describe("TimeParser", () => {

  it("turns a time string into seconds from midnight", () => {
    const parser = new TimeParser();

    expect(parser.getTime("00:00:00")).to.equal(0);
    expect(parser.getTime("00:00:10")).to.equal(10);
    expect(parser.getTime("00:02:10")).to.equal(130);
    expect(parser.getTime("03:02:10")).to.equal(10930);
  });

  it("does not cap the hours at 24", () => {
    const parser = new TimeParser();

    // a call after midnight belongs to the day the trip started
    expect(parser.getTime("25:30:00")).to.equal(91800);
  });

  it("accepts a time with no seconds", () => {
    const parser = new TimeParser();

    // seconds are optional in GTFS. This used to read as NaN and say nothing about it.
    expect(parser.getTime("10:00")).to.equal(36000);
  });

  it("refuses a time it cannot read", () => {
    const parser = new TimeParser();

    // a blank arrival_time is legitimate GTFS for a stop the feed gives no time for, and this
    // does not handle it - but failing the load says so, where NaN times quietly plan nonsense
    expect(() => parser.getTime("")).to.throw();
    expect(() => parser.getTime("not a time")).to.throw();
  });

  it("caches, and gives the same answer either way", () => {
    const parser = new TimeParser();

    expect(parser.getTime("09:15:00")).to.equal(parser.getTime("09:15:00"));
  });

});
