import * as chai from "chai";
import {Schedule, STP, TUID} from "../../src/gtfs/native/Schedule";
import {Days, ScheduleCalendar} from "../../src/gtfs/native/ScheduleCalendar";
import moment = require("moment");
import {RouteType} from "../../src/gtfs/file/Route";
import {CalendarFactory} from "../../src/gtfs/CalendarFactory";

describe("CalendarFactory", () => {

  it("returns unique calendar entries", () => {
    const schedules = [
      schedule(1, "A", "2017-01-01", "2017-01-31"),
      schedule(3, "B", "2017-01-01", "2017-01-31"),
      schedule(5, "C", "2017-01-01", "2017-01-31")
    ];

    const [calendars] = CalendarFactory.getCalendar(schedules);

    chai.expect(calendars.length).to.equal(1);
    chai.expect(calendars[0].start_date).to.equal("20170101");
    chai.expect(calendars[0].end_date).to.equal("20170131");
  });

  it("creates the serviceId index", () => {
    const schedule1 = schedule(1, "A", "2017-01-01", "2017-01-31");
    const schedule2 = schedule(3, "B", "2017-01-01", "2017-01-31");
    const schedule3 = schedule(5, "C", "2017-01-01", "2017-01-31");
    const schedule4 = schedule(7, "D", "2017-01-01", "2017-01-31", { 0: 0, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 0 });

    const schedules = [schedule1, schedule2, schedule3, schedule4];

    const [calendars, _, index] = CalendarFactory.getCalendar(schedules);

    chai.expect(index[schedule1.calendar.id]).to.equal(1);
    chai.expect(index[schedule2.calendar.id]).to.equal(1);
    chai.expect(index[schedule3.calendar.id]).to.equal(1);
    chai.expect(index[schedule4.calendar.id]).to.equal(2);
  });

});

function schedule(id: number, tuid: TUID, from: string, to: string, days: Days = { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 }): Schedule {
  return new Schedule(
    id,
    [],
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
    STP.Overlay
  );
}
