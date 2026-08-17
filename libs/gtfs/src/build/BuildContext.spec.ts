import {describe, it, expect} from "vitest";
import {buildContext, dateRange, option, parseRange} from "./BuildContext";

describe("parseRange", () => {

  it("reads the mysql interval expressions GTFS_RANGE has always used", () => {
    expect(parseRange("3 MONTH").months).to.equal(3);
    expect(parseRange("6 MONTH").months).to.equal(6);
    expect(parseRange("1 YEAR").years).to.equal(1);
  });

  it("reads the plural, lower case form the CLI uses", () => {
    expect(parseRange("6 months").months).to.equal(6);
    expect(parseRange("28 days").days).to.equal(28);
    expect(parseRange("2 weeks").weeks).to.equal(2);
  });

  it("refuses anything it cannot read rather than guessing", () => {
    expect(() => parseRange("3 fortnights")).to.throw(/Cannot read/);
    expect(() => parseRange("months")).to.throw(/Cannot read/);
    expect(() => parseRange("3")).to.throw(/Cannot read/);
    // A mysql expression the driver would have accepted but nobody should write
    expect(() => parseRange("3 MONTH + 1 DAY")).to.throw(/Cannot read/);
  });

});

describe("option", () => {

  it("reads --name value", () => {
    expect(option(["node", "dtd2mysql", "--gtfs", "out", "--today", "2025-09-02"], "today"))
      .to.equal("2025-09-02");
  });

  it("reads --name=value", () => {
    expect(option(["node", "dtd2mysql", "--gtfs", "out", "--today=2025-09-02"], "today"))
      .to.equal("2025-09-02");
  });

  it("is undefined when the option is absent", () => {
    expect(option(["node", "dtd2mysql", "--gtfs", "out"], "today")).to.equal(undefined);
  });

  it("does not mistake one option for another with the same prefix", () => {
    expect(option(["node", "dtd2mysql", "--todays-date", "nope"], "today")).to.equal(undefined);
  });

});

describe("buildContext", () => {

  const argv = (...args: string[]) => ["node", "dtd2mysql", "--gtfs", "out", ...args];

  it("defaults to three months from the current date", () => {
    const context = buildContext(argv(), {});

    expect(context.today.toString()).to.equal(Temporal.Now.plainDateISO().toString());
    expect(context.range.months).to.equal(3);
  });

  it("pins the date so a build can be reproduced", () => {
    const context = buildContext(argv("--today", "2025-09-02"), {});

    expect(context.today.toString()).to.equal("2025-09-02");
  });

  it("takes the date and range from the environment", () => {
    const context = buildContext(argv(), {GTFS_TODAY: "2025-09-02", GTFS_RANGE: "6 MONTH"});

    expect(context.today.toString()).to.equal("2025-09-02");
    expect(context.range.months).to.equal(6);
  });

  it("lets the command line win over the environment", () => {
    const context = buildContext(
      argv("--today", "2026-01-01", "--range", "1 year"),
      {GTFS_TODAY: "2025-09-02", GTFS_RANGE: "6 MONTH"}
    );

    expect(context.today.toString()).to.equal("2026-01-01");
    expect(context.range.years).to.equal(1);
  });

});

describe("dateRange", () => {

  it("runs from the build date to the build date plus the range", () => {
    const range = dateRange({
      today: Temporal.PlainDate.from("2025-09-02"),
      range: parseRange("3 MONTH")
    });

    expect(range.from.toString()).to.equal("2025-09-02");
    expect(range.to.toString()).to.equal("2025-12-02");
  });

  it("clamps a short month the same way mysql does", () => {
    // MySQL: '2025-08-31' + INTERVAL 1 MONTH = '2025-09-30'
    const range = dateRange({
      today: Temporal.PlainDate.from("2025-08-31"),
      range: parseRange("1 MONTH")
    });

    expect(range.to.toString()).to.equal("2025-09-30");
  });

});
