import * as chai from "chai";
import {Schedule, STP, TUID} from "../../src/gtfs/native/Schedule";
import {ScheduleCalendar} from "../../src/gtfs/native/ScheduleCalendar";
import moment = require("moment");
import {ScheduleOverlayApplication} from "../../src/gtfs/ScheduleOverlayApplication";
import {RouteType} from "../../src/gtfs/file/Route";

describe("ScheduleOverlayApplication", () => {

  it("adds exclude days for short overlays", () => {
    const baseSchedules = [
      schedule(1, "A", "2017-01-01", "2017-01-31"),
      schedule(2, "A", "2017-01-05", "2017-01-07")
    ];

    const schedules = ScheduleOverlayApplication.processSchedules(baseSchedules);

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

  it("adds divides schedules where overlapped", () => {
    const baseSchedules = [
      schedule(1, "A", "2017-01-01", "2017-01-31", STP.Permanent),
      schedule(2, "A", "2017-02-01", "2017-02-28", STP.Permanent),
      schedule(3, "B", "2017-01-02", "2017-03-15", STP.Permanent),
      schedule(4, "A", "2017-01-15", "2017-02-15", STP.Overlay),
    ];

    const schedules = ScheduleOverlayApplication.processSchedules(baseSchedules);

    chai.expect(schedules[0].calendar.runsFrom.isSame("20170101")).to.be.true;
    chai.expect(schedules[0].calendar.runsTo.isSame("20170114")).to.be.true;
    chai.expect(schedules[1].calendar.runsFrom.isSame("20170216")).to.be.true;
    chai.expect(schedules[1].calendar.runsTo.isSame("20170228")).to.be.true;
    chai.expect(schedules[2].calendar.runsFrom.isSame("20170115")).to.be.true;
    chai.expect(schedules[2].calendar.runsTo.isSame("20170215")).to.be.true;
    chai.expect(schedules[3].calendar.runsFrom.isSame("20170102")).to.be.true;
    chai.expect(schedules[3].calendar.runsTo.isSame("20170315")).to.be.true;
  });

  it("removes cancellations", () => {
    const baseSchedules = [
      schedule(1, "A", "2017-01-01", "2017-01-31"),
      schedule(2, "A", "2017-01-05", "2017-01-07", STP.Cancellation)
    ];

    const schedules = ScheduleOverlayApplication.processSchedules(baseSchedules);

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

function schedule(id: number, tuid: TUID, from: string, to: string, stp: STP = STP.Overlay): Schedule {
  return new Schedule(
    id,
    [],
    tuid,
    "",
    new ScheduleCalendar(
      moment(from),
      moment(to),
      { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 },
      {}
    ),
    RouteType.Rail,
    "LN",
    stp
  );
}
