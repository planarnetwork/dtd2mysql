import {describe, expect, it} from 'vitest';
import {STP} from "../model/OverlayRecord";
import {applyOverlays} from "../transform/ApplyOverlays";
import {mergeSchedules} from "../transform/MergeSchedules";
import {schedule} from "./MergeSchedules.spec";

describe("ApplyOverlays", () => {

  it("adds exclude days for overlays", () => {
    const baseSchedules = [
      schedule(1, "A", "2017-01-01", "2017-01-31"),
      schedule(2, "A", "2017-01-05", "2017-01-07", STP.Overlay, { 0: 0, 1: 0, 2: 0, 3: 0, 4: 1, 5: 1, 6: 1 })
    ];

    const schedules = mergeSchedules(applyOverlays(baseSchedules));

    expect(schedules[0].calendar.runsFrom.equals("20170101")).to.be.true;
    expect(schedules[0].calendar.runsTo.equals("20170131")).to.be.true;
    expect(schedules[1].calendar.runsFrom.equals("20170105")).to.be.true;
    expect(schedules[1].calendar.runsTo.equals("20170107")).to.be.true;

    const excludeDays = Object.keys(schedules[0].calendar.excludeDays);

    expect(excludeDays.length).to.equal(3);
    expect(excludeDays[0]).to.equal("20170105");
    expect(excludeDays[1]).to.equal("20170106");
    expect(excludeDays[2]).to.equal("20170107");
  });

  it("divides schedules where overlapped", () => {
    const baseSchedules = [
      schedule(1, "A", "2017-01-01", "2017-01-31", STP.Permanent),
      schedule(2, "A", "2017-02-01", "2017-02-28", STP.Permanent),
      schedule(3, "B", "2017-01-02", "2017-03-15", STP.Permanent),
      schedule(4, "A", "2017-01-15", "2017-02-15", STP.Overlay),
    ];

    const schedules = applyOverlays(baseSchedules);

    expect(schedules["A"][0].calendar.runsFrom.equals("20170101")).to.be.true;
    expect(schedules["A"][0].calendar.runsTo.equals("20170131")).to.be.true;
    expect(schedules["A"][1].calendar.runsFrom.equals("20170201")).to.be.true;
    expect(schedules["A"][1].calendar.runsTo.equals("20170228")).to.be.true;
    expect(schedules["A"][2].calendar.runsFrom.equals("20170115")).to.be.true;
    expect(schedules["A"][2].calendar.runsTo.equals("20170215")).to.be.true;
    expect(schedules["B"][0].calendar.runsFrom.equals("20170102")).to.be.true;
    expect(schedules["B"][0].calendar.runsTo.equals("20170315")).to.be.true;
  });

  it("applies an overlay that doesn't overlap", () => {
    const perm = schedule(1, "A", "2017-01-01", "2017-01-31");
    const nolay = schedule(2, "A", "2017-02-05", "2017-02-07");

    const schedules = applyOverlays([perm, nolay]);

    expect(schedules["A"][0]).to.equal(perm);
    expect(schedules["A"][1]).to.equal(nolay);
  });

  it("applies an overlay", () => {
    const perm = schedule(1, "A", "2017-01-01", "2017-01-31");
    const overlay = schedule(2, "A", "2017-01-05", "2017-01-07");

    const schedules = applyOverlays([perm, overlay]);

    expect(schedules["A"][0]).not.to.equal(perm);
    expect(schedules["A"][0].tuid).to.equal(perm.tuid);
    expect(schedules["A"][1]).to.equal(overlay);
  });

  it("removes cancellations", () => {
    const baseSchedules = [
      schedule(1, "A", "2017-01-01", "2017-01-31"),
      schedule(2, "A", "2017-01-05", "2017-01-07", STP.Cancellation)
    ];

    const schedules = mergeSchedules(applyOverlays(baseSchedules));

    expect(schedules.length).to.equal(1);
    expect(schedules[0].calendar.runsFrom.equals("20170101")).to.be.true;
    expect(schedules[0].calendar.runsTo.equals("20170131")).to.be.true;

    const excludeDays = Object.keys(schedules[0].calendar.excludeDays);

    expect(excludeDays.length).to.equal(3);
    expect(excludeDays[0]).to.equal("20170105");
    expect(excludeDays[1]).to.equal("20170106");
    expect(excludeDays[2]).to.equal("20170107");
  });

});
