import {describe, it, expect} from 'vitest';
import {formatDuration, parseDuration, SECONDS_IN_DAY} from "../../../src/gtfs/native/Duration";

describe("Duration", () => {

  it("parses HH:MM:SS", () => {
    expect(parseDuration("00:00:00")).to.equal(0);
    expect(parseDuration("06:30:00")).to.equal(23400);
    expect(parseDuration("23:59:59")).to.equal(86399);
  });

  it("parses HH:MM", () => {
    expect(parseDuration("00:00")).to.equal(0);
    expect(parseDuration("06:30")).to.equal(23400);
  });

  it("parses times past midnight", () => {
    expect(parseDuration("25:30:00")).to.equal(SECONDS_IN_DAY + 5400);
    expect(parseDuration("24:00:00")).to.equal(SECONDS_IN_DAY);
  });

  it("throws rather than returning NaN", () => {
    expect(() => parseDuration("")).to.throw();
    expect(() => parseDuration("not a time")).to.throw();
  });

  it("round trips through formatDuration", () => {
    expect(formatDuration(parseDuration("06:30:00"))).to.equal("06:30:00");
    expect(formatDuration(parseDuration("25:30:00"))).to.equal("25:30:00");
  });

});
