import * as chai from "chai";
import * as moment from "moment";
import {STP, TUID} from "../../../src/gtfs/native/OverlayRecord";
import {mergeSchedules} from "../../../src/gtfs/command/MergeSchedules";
import {applyOverlays} from "../../../src/gtfs/command/ApplyOverlays";
import {Days, ScheduleCalendar} from "../../../src/gtfs/native/ScheduleCalendar";
import {StopTime} from "../../../src/gtfs/file/StopTime";
import {Schedule} from "../../../src/gtfs/native/Schedule";
import {RouteType} from "../../../src/gtfs/file/Route";

describe("MergeSchedules", () => {

  it("merges schedules where they are the same", () => {
    const baseSchedules = [
      schedule(1, "A", "2017-01-01", "2017-01-31", STP.Permanent),
      schedule(2, "A", "2017-02-01", "2017-02-28", STP.Permanent),
      schedule(3, "B", "2017-01-02", "2017-03-15", STP.Permanent),
      schedule(4, "A", "2017-01-15", "2017-02-15", STP.Overlay),
    ];

    const schedules = mergeSchedules(applyOverlays(baseSchedules));

    chai.expect(schedules[0].calendar.runsFrom.isSame("20170101")).to.be.true;
    chai.expect(schedules[0].calendar.runsTo.isSame("20170228")).to.be.true;
    chai.expect(schedules[1].calendar.runsFrom.isSame("20170102")).to.be.true;
    chai.expect(schedules[1].calendar.runsTo.isSame("20170315")).to.be.true;
  });

});

const ALL_DAYS: Days = { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 };

export function schedule(id: number,
                         tuid: TUID,
                         from: string,
                         to: string,
                         stp: STP = STP.Overlay,
                         days: Days = ALL_DAYS,
                         stops: StopTime[] = []): Schedule {

  return new Schedule(
    id,
    stops,
    tuid,
    "",
    new ScheduleCalendar(
      moment(from),
      moment(to),
      days,
      {}
    ),
    RouteType.Rail,
    "LN",
    stp,
    true,
    true
  );
}
