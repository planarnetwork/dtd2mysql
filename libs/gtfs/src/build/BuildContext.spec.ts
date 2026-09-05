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
    // Read either side of the call rather than compared to a single reading, so
    // a run that crosses midnight sees the date it started with or the one it
    // ended with and not a mismatch. vi.setSystemTime cannot help here: it moves
    // Date and leaves Temporal.Now on the real clock.
    const before = Temporal.Now.plainDateISO().toString();
    const context = buildContext(argv(), {});
    const after = Temporal.Now.plainDateISO().toString();

    expect([before, after]).to.contain(context.today.toString());
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
      range: parseRange("3 MONTH"),
      links: false,
      removePassingPoints: true,
      duplicateOvernightAssociations: false
    });

    expect(range.from.toString()).to.equal("2025-09-02");
    expect(range.to.toString()).to.equal("2025-12-02");
  });

  it("clamps a short month the same way mysql does", () => {
    // MySQL: '2025-08-31' + INTERVAL 1 MONTH = '2025-09-30'
    const range = dateRange({
      today: Temporal.PlainDate.from("2025-08-31"),
      range: parseRange("1 MONTH"),
      links: false,
      removePassingPoints: true,
      duplicateOvernightAssociations: false
    });

    expect(range.to.toString()).to.equal("2025-09-30");
  });

});

describe("buildContext links", () => {

  const argv = (...args: string[]) => ["node", "dtd2mysql", "--gtfs", "out", ...args];

  it("does not write links.txt unless asked", () => {
    expect(buildContext(argv(), {}).links).to.equal(false);
  });

  it("writes it for --links", () => {
    expect(buildContext(argv("--links"), {}).links).to.equal(true);
  });

  it("writes it for GTFS_LINKS=1", () => {
    expect(buildContext(argv(), {GTFS_LINKS: "1"}).links).to.equal(true);
  });

});

describe("buildContext removePassingPoints", () => {

  const argv = (...args: string[]) => ["node", "dtd2mysql", "--gtfs", "out", ...args];

  it("drops the locations a service passes through unless told otherwise", () => {
    expect(buildContext(argv(), {}).removePassingPoints).to.equal(true);
  });

  it("keeps them for --remove-passing-points false", () => {
    expect(buildContext(argv("--remove-passing-points", "false"), {}).removePassingPoints).to.equal(false);
  });

  it("keeps them for --remove-passing-points=false", () => {
    expect(buildContext(argv("--remove-passing-points=false"), {}).removePassingPoints).to.equal(false);
  });

  it("keeps them for GTFS_REMOVE_PASSING_POINTS=0", () => {
    expect(buildContext(argv(), {GTFS_REMOVE_PASSING_POINTS: "0"}).removePassingPoints).to.equal(false);
  });

  it("lets the flag win over the environment", () => {
    const context = buildContext(argv("--remove-passing-points=true"), {GTFS_REMOVE_PASSING_POINTS: "0"});

    expect(context.removePassingPoints).to.equal(true);
  });

  /**
   * The bare flag reads as though it turns something on, and this setting is
   * already on. Rejecting it is the only reading that cannot be wrong.
   */
  it("refuses a bare --remove-passing-points", () => {
    expect(() => buildContext(argv("--remove-passing-points"), {})).to.throw(/needs a value/);
  });

  it("refuses a value it cannot read as a yes or no", () => {
    expect(() => buildContext(argv("--remove-passing-points=maybe"), {})).to.throw(/Expected true or false/);
  });

});

describe("buildContext duplicateOvernightAssociations", () => {

  const argv = (...args: string[]) => ["node", "dtd2mysql", "--gtfs", "out", ...args];

  it("does not duplicate an overnight association unless asked", () => {
    expect(buildContext(argv(), {}).duplicateOvernightAssociations).to.equal(false);
  });

  it("duplicates for --duplicate-overnight-associations", () => {
    expect(buildContext(argv("--duplicate-overnight-associations"), {}).duplicateOvernightAssociations).to.equal(true);
  });

  it("duplicates for GTFS_DUPLICATE_OVERNIGHT_ASSOCIATIONS=1", () => {
    expect(buildContext(argv(), {GTFS_DUPLICATE_OVERNIGHT_ASSOCIATIONS: "1"}).duplicateOvernightAssociations).to.equal(true);
  });

  /**
   * `Boolean(env.GTFS_DUPLICATE_OVERNIGHT_ASSOCIATIONS)` would read every one
   * of these as a yes, which is the opposite of what each of them says.
   */
  it("does not duplicate for a GTFS_DUPLICATE_OVERNIGHT_ASSOCIATIONS that says no", () => {
    for (const value of ["0", "false", "no", "off"]) {
      expect(buildContext(argv(), {GTFS_DUPLICATE_OVERNIGHT_ASSOCIATIONS: value}).duplicateOvernightAssociations)
        .to.equal(false);
    }
  });

});
