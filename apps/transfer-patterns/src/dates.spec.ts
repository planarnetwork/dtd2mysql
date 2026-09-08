import {describe, expect, it} from "vitest";
import {checkWithinFeed, defaultDates, parseDates, toISODate} from "./dates.js";

describe("defaultDates", () => {
  it("takes the next day of each shape", () => {
    // 2026-09-07 is a Monday.
    expect(defaultDates(new Date("2026-09-07T00:00:00Z")).map(toISODate)).to.deep.equal([
      "2026-09-08", // Tuesday
      "2026-09-11", // Friday
      "2026-09-12", // Saturday
      "2026-09-13"  // Sunday
    ]);
  });

  it("counts today as the next of its own shape", () => {
    // A Saturday, so Saturday is today rather than a week away.
    const dates = defaultDates(new Date("2026-09-12T00:00:00Z")).map(toISODate);

    expect(dates).to.contain("2026-09-12");
  });

  it("stays inside a week of the date it starts from", () => {
    const from = new Date("2026-09-07T00:00:00Z");
    const week = 7 * 24 * 60 * 60 * 1000;

    for (const date of defaultDates(from)) {
      expect(date.getTime() - from.getTime()).to.be.lessThan(week);
      expect(date.getTime()).to.be.at.least(from.getTime());
    }
  });

  it("gives four distinct days", () => {
    const dates = defaultDates(new Date("2026-09-07T00:00:00Z")).map(toISODate);

    expect(new Set(dates).size).to.equal(4);
  });

  it("is not thrown by the time of day it is asked at", () => {
    const morning = defaultDates(new Date("2026-09-07T05:00:00Z")).map(toISODate);
    const midnight = defaultDates(new Date("2026-09-07T00:00:00Z")).map(toISODate);

    expect(morning).to.deep.equal(midnight);
  });
});

describe("parseDates", () => {
  it("reads a comma separated list", () => {
    expect(parseDates("2026-09-15,2026-09-16", new Date()).map(toISODate))
      .to.deep.equal(["2026-09-15", "2026-09-16"]);
  });

  it("ignores the spaces around a date", () => {
    expect(parseDates(" 2026-09-15 , 2026-09-16 ", new Date()).map(toISODate))
      .to.deep.equal(["2026-09-15", "2026-09-16"]);
  });

  it("falls back to the defaults", () => {
    const from = new Date("2026-09-07T00:00:00Z");

    expect(parseDates(undefined, from)).to.deep.equal(defaultDates(from));
  });

  it("refuses something that is not a date", () => {
    expect(() => parseDates("next tuesday", new Date())).to.throw("--dates wants YYYY-MM-DD");
    expect(() => parseDates("15/09/2026", new Date())).to.throw("--dates wants YYYY-MM-DD");
  });
});

describe("checkWithinFeed", () => {
  it("accepts dates the feed covers", () => {
    expect(() => checkWithinFeed(
      [new Date("2026-09-15T00:00:00Z")], 20260901, 20261201
    )).not.to.throw();
  });

  it("accepts the ends of the window", () => {
    expect(() => checkWithinFeed(
      [new Date("2026-09-01T00:00:00Z"), new Date("2026-12-01T00:00:00Z")], 20260901, 20261201
    )).not.to.throw();
  });

  it("says which dates the feed does not cover", () => {
    expect(() => checkWithinFeed(
      [new Date("2026-09-15T00:00:00Z"), new Date("2027-01-05T00:00:00Z")], 20260901, 20261201
    )).to.throw("does not include 2027-01-05");
  });

  it("has nothing to check when the feed does not say", () => {
    expect(() => checkWithinFeed([new Date("2027-01-05T00:00:00Z")])).not.to.throw();
  });
});
