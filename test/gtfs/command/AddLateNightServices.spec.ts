import * as chai from "chai";
import {STP} from "../../../src/gtfs/native/OverlayRecord";
import {schedule} from "./MergeSchedules.spec";
import {stop} from "./ApplyAssociations.spec";
import {addLateNightServices} from "../../../src/gtfs/command/AddLateNightServices";
import {Days} from "../../../src/gtfs/native/ScheduleCalendar";

describe("AddLateNightServices", () => {
  const WEEK_DAYS: Days = { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 0, 6: 0 };

  it("merges schedules where they are the same", () => {
    const baseSchedules = [
      schedule(1, "A", "2018-10-01", "2018-10-31", STP.Permanent, WEEK_DAYS, [
        stop(1, "TON", "01:30"),
        stop(2, "PDW", "01:40"),
        stop(3, "ASH", "01:50")
      ]),
      schedule(2, "B", "2018-10-01", "2018-10-31", STP.Permanent, WEEK_DAYS, [
        stop(1, "TON", "02:30"),
        stop(2, "PDW", "02:40"),
        stop(3, "ASH", "02:50")
      ]),
    ];

    const schedules = addLateNightServices(baseSchedules, idGenerator());

    chai.expect(schedules[0].calendar.runsFrom.isSame("20180930")).to.be.true;
    chai.expect(schedules[0].calendar.runsTo.isSame("20181030")).to.be.true;
    chai.expect(schedules[0].calendar.days[0]).to.equal(1);
    chai.expect(schedules[0].calendar.days[1]).to.equal(1);
    chai.expect(schedules[0].calendar.days[2]).to.equal(1);
    chai.expect(schedules[0].calendar.days[3]).to.equal(1);
    chai.expect(schedules[0].calendar.days[4]).to.equal(0);
    chai.expect(schedules[0].calendar.days[5]).to.equal(0);
    chai.expect(schedules[0].calendar.days[6]).to.equal(1);
    chai.expect(schedules[1].calendar.runsFrom.isSame("20181001")).to.be.true;
    chai.expect(schedules[1].calendar.runsTo.isSame("20181031")).to.be.true;
  });

});

function *idGenerator(): IterableIterator<number> {
  let id = 0;
  while (true) {
    yield id++;
  }
}
