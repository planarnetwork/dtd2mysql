import {describe, it, expect} from "vitest";
import {toGTFSDate} from "./gtfsDateUtils";

describe("toGTFSDate", () => {
  it("returns a GTFS date string", () => {
    const date = new Date("2019-06-04T00:00:00");
    const result = toGTFSDate(date);

    expect(result).to.equal("20190604");
  });

  it("pads a single digit month and day", () => {
    expect(toGTFSDate(new Date("2020-01-01T00:00:00"))).to.equal("20200101");
  });

  /**
   * The caller's day, not Greenwich's: a merge run at half past midnight in
   * British Summer Time is being run on the day the caller thinks it is.
   */
  it("is the local date, not the UTC one", () => {
    const date = new Date(2019, 5, 4, 0, 30, 0);

    expect(toGTFSDate(date)).to.equal("20190604");
  });
});
