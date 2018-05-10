import * as chai from "chai";
import {STP} from "../../../src/gtfs/native/OverlayRecord";
import {applyOverlays} from "../../../src/gtfs/command/ApplyOverlays";
import {mergeSchedules} from "../../../src/gtfs/command/MergeSchedules";
import {schedule} from "./MergeSchedules.spec";

describe("ApplyOverlays", () => {

  it("adds exclude days for short overlays", () => {
    const baseSchedules = [
      schedule(1, "A", "2017-01-01", "2017-01-31"),
      schedule(2, "A", "2017-01-05", "2017-01-07", STP.Overlay, { 0: 0, 1: 0, 2: 0, 3: 0, 4: 1, 5: 1, 6: 1 })
    ];

    const schedules = mergeSchedules(applyOverlays(baseSchedules));

    chai.expect(schedules[0].calendar.runsFrom.isSame("20170101")).to.be.true;
    chai.expect(schedules[0].calendar.runsTo.isSame("20170131")).to.be.true;
    chai.expect(schedules[1].calendar.runsFrom.isSame("20170105")).to.be.true;
    chai.expect(schedules[1].calendar.runsTo.isSame("20170107")).to.be.true;

    const excludeDays = Object.keys(schedules[0].calendar.excludeDays);

    chai.expect(excludeDays.length).to.equal(3);
    chai.expect(excludeDays[0]).to.equal("20170105");
    chai.expect(excludeDays[1]).to.equal("20170106");
    chai.expect(excludeDays[2]).to.equal("20170107");
  });

  it("divides schedules where overlapped", () => {
    const baseSchedules = [
      schedule(1, "A", "2017-01-01", "2017-01-31", STP.Permanent),
      schedule(2, "A", "2017-02-01", "2017-02-28", STP.Permanent),
      schedule(3, "B", "2017-01-02", "2017-03-15", STP.Permanent),
      schedule(4, "A", "2017-01-15", "2017-02-15", STP.Overlay),
    ];

    const schedules = applyOverlays(baseSchedules);

    chai.expect(schedules["A"][0].calendar.runsFrom.isSame("20170101")).to.be.true;
    chai.expect(schedules["A"][0].calendar.runsTo.isSame("20170114")).to.be.true;
    chai.expect(schedules["A"][1].calendar.runsFrom.isSame("20170216")).to.be.true;
    chai.expect(schedules["A"][1].calendar.runsTo.isSame("20170228")).to.be.true;
    chai.expect(schedules["A"][2].calendar.runsFrom.isSame("20170115")).to.be.true;
    chai.expect(schedules["A"][2].calendar.runsTo.isSame("20170215")).to.be.true;
    chai.expect(schedules["B"][0].calendar.runsFrom.isSame("20170102")).to.be.true;
    chai.expect(schedules["B"][0].calendar.runsTo.isSame("20170315")).to.be.true;
  });

  it("applies an overlay that doesn't overlap", () => {
    const perm = schedule(1, "A", "2017-01-01", "2017-01-31");
    const nolay = schedule(2, "A", "2017-02-05", "2017-02-07");

    const schedules = applyOverlays([perm, nolay]);

    chai.expect(schedules["A"][0]).to.equal(perm);
    chai.expect(schedules["A"][1]).to.equal(nolay);
  });

  it("applies a short overlay", () => {
    const perm = schedule(1, "A", "2017-01-01", "2017-01-31");
    const short = schedule(2, "A", "2017-01-05", "2017-01-07");

    const schedules = applyOverlays([perm, short]);

    chai.expect(schedules["A"][0]).not.to.equal(perm);
    chai.expect(schedules["A"][0].tuid).to.equal(perm.tuid);
  });

  it("applies a long overlay", () => {
    const perm = schedule(1, "A", "2017-01-01", "2017-01-31");
    const long = schedule(2, "A", "2017-01-02", "2017-01-30");

    const schedules = applyOverlays([perm, long]);
    const [s1, s2, s3] = schedules["A"];

    chai.expect(s1).not.to.equal(perm);
    chai.expect(s1.tuid).to.equal(perm.tuid);
    chai.expect(s2).not.to.equal(perm);
    chai.expect(s2.tuid).to.equal(perm.tuid);
    chai.expect(s3).to.equal(long);
  });

  it("removes cancellations", () => {
    const baseSchedules = [
      schedule(1, "A", "2017-01-01", "2017-01-31"),
      schedule(2, "A", "2017-01-05", "2017-01-07", STP.Cancellation)
    ];

    const schedules = mergeSchedules(applyOverlays(baseSchedules));

    chai.expect(schedules.length).to.equal(1);
    chai.expect(schedules[0].calendar.runsFrom.isSame("20170101")).to.be.true;
    chai.expect(schedules[0].calendar.runsTo.isSame("20170131")).to.be.true;

    const excludeDays = Object.keys(schedules[0].calendar.excludeDays);

    chai.expect(excludeDays.length).to.equal(3);
    chai.expect(excludeDays[0]).to.equal("20170105");
    chai.expect(excludeDays[1]).to.equal("20170106");
    chai.expect(excludeDays[2]).to.equal("20170107");
  });

});
