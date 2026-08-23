import {describe, it, expect} from "vitest";
import {interchange, mergeTransfers} from "./MergeTransfers";
import {FixedLink} from "../entity/FixedLink";
import {CRS, StopID} from "../entity/Stop";

const link = (from: string, to: string, overrides: Partial<FixedLink> = {}): FixedLink => ({
  from_stop_id: from, to_stop_id: to, mode: "WALK", duration: 600,
  start_time: "08:00:00", end_time: "20:00:00", start_date: "2024-01-01", end_date: "2024-12-31",
  monday: 1, tuesday: 1, wednesday: 1, thursday: 1, friday: 1, saturday: 0, sunday: 0,
  ...overrides
});

const stations: ReadonlyMap<CRS, StopID> = new Map([
  ["TON", "910GTONBDG"],
  ["SEV", "910GSEVNOKS"]
]);

describe("mergeTransfers", () => {

  it("writes one row per pair, whatever the links say", () => {
    const rows = mergeTransfers([], [link("TON", "SEV"), link("TON", "SEV", {mode: "TUBE"})], stations);

    expect(rows.length).to.equal(1);
    expect([rows[0].from_stop_id, rows[0].to_stop_id]).to.deep.equal(["910GTONBDG", "910GSEVNOKS"]);
  });

  it("references the station rather than the CRS the sources describe it by", () => {
    const rows = mergeTransfers([interchange("TON", 300)], [], stations);

    expect([rows[0].from_stop_id, rows[0].to_stop_id]).to.deep.equal(["910GTONBDG", "910GTONBDG"]);
  });

  it("leaves the extension columns null on a station interchange", () => {
    const [row] = mergeTransfers([interchange("TON", 300)], [], stations);

    expect(row.min_transfer_time).to.equal(300);
    expect([row.mode, row.start_time, row.start_date, row.monday]).to.deep.equal([null, null, null, null]);
  });

  it("drops a link at a station the feed does not publish", () => {
    const rows = mergeTransfers([], [link("TON", "QQQ"), link("QQQ", "SEV")], stations);

    expect(rows).to.deep.equal([]);
  });

  describe("the envelope of several links describing one pair", () => {

    const rows = () => mergeTransfers([], [
      link("TON", "SEV", {mode: "TUBE", duration: 900, start_time: "06:00:00", end_time: "20:00:00",
                          start_date: "2024-02-01", end_date: "2024-12-31", saturday: 1}),
      link("TON", "SEV", {mode: "WALK", duration: 600, start_time: "08:00:00", end_time: "23:00:00",
                          start_date: "2024-01-01", end_date: "2024-06-30", sunday: 1})
    ], stations);

    it("takes the shortest time, which is what min_transfer_time means", () => {
      expect(rows()[0].min_transfer_time).to.equal(600);
    });

    it("names every mode, sorted, so the row does not depend on the order they arrived", () => {
      expect(rows()[0].mode).to.equal("TUBE|WALK");
    });

    it("runs from the earliest start to the latest end", () => {
      const [row] = rows();

      expect([row.start_time, row.end_time]).to.deep.equal(["06:00:00", "23:00:00"]);
      expect([row.start_date, row.end_date]).to.deep.equal(["2024-01-01", "2024-12-31"]);
    });

    it("runs on a day any of them runs on", () => {
      const [row] = rows();

      expect([row.monday, row.saturday, row.sunday]).to.deep.equal([1, 1, 1]);
    });

  });

  it("keeps the shorter of an interchange time and a link on the same pair", () => {
    // The ALF describes a walk between a station and itself. Replacing the row
    // outright would throw the station's own minimum change time away.
    const rows = mergeTransfers([interchange("TON", 300)], [link("TON", "TON", {duration: 900})], stations);

    expect(rows.length).to.equal(1);
    expect(rows[0].min_transfer_time).to.equal(300);
    expect(rows[0].mode).to.equal("WALK");
  });

  it("reads a day flag whether the source gives a number or a string", () => {
    // MySQL returns a TINYINT as a number from a plain select and as a string
    // through a UNION, and getFixedLinks is a UNION. Comparing "1" to 1 turns
    // every day off, and the row still writes as a plausible 0.
    const strings = {monday: "1", tuesday: "0", wednesday: "1", thursday: "0",
                     friday: "1", saturday: "0", sunday: "1"} as unknown as Partial<FixedLink>;
    const [row] = mergeTransfers([], [link("TON", "SEV", strings)], stations);

    expect([row.monday, row.tuesday, row.wednesday, row.thursday, row.friday, row.saturday, row.sunday])
      .to.deep.equal([1, 0, 1, 0, 1, 0, 1]);
  });

  it("produces the same row whichever order the links arrive in", () => {
    const a = link("TON", "SEV", {mode: "TUBE", duration: 900, start_time: "06:00:00"});
    const b = link("TON", "SEV", {mode: "WALK", duration: 600, end_time: "23:00:00"});

    expect(mergeTransfers([], [b, a], stations)).to.deep.equal(mergeTransfers([], [a, b], stations));
  });

});
