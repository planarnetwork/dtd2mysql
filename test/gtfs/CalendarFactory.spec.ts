import * as chai from "chai";
import {Schedule, STP, TUID} from "../../src/gtfs/native/Schedule";
import {ScheduleCalendar} from "../../src/gtfs/native/ScheduleCalendar";
import moment = require("moment");
import {CalendarFactory} from "../../src/gtfs/CalendarFactory";
import {RouteType} from "../../src/gtfs/file/Route";

describe("CalendarFactory", () => {

  it("adds exclude days for short overlays", () => {
    const schedules = [
      schedule(1, "A", "2017-01-01", "2017-01-31"),
      schedule(2, "A", "2017-01-05", "2017-01-07")
    ];

    const factory = new CalendarFactory();
    const [calendars, calendarDates] = factory.createCalendar(schedules);

    chai.expect(calendars[0].start_date).to.equal("20170101");
    chai.expect(calendars[0].end_date).to.equal("20170131");

    chai.expect(calendarDates.length).to.equal(3);
    chai.expect(calendarDates[0].date).to.equal("20170105");
    chai.expect(calendarDates[1].date).to.equal("20170106");
    chai.expect(calendarDates[2].date).to.equal("20170107");
  });

  it("adds divides schedules where overlapped", () => {
    const schedules = [
      schedule(1, "A", "2017-01-01", "2017-01-31"),
      schedule(2, "A", "2017-02-01", "2017-02-28"),
      schedule(3, "B", "2017-01-02", "2017-03-15"),
      schedule(4, "A", "2017-01-15", "2017-02-15"),
    ];

    const factory = new CalendarFactory();
    const [calendars] = factory.createCalendar(schedules);

    chai.expect(calendars[0].start_date).to.equal("20170101");
    chai.expect(calendars[0].end_date).to.equal("20170114");
    chai.expect(calendars[1].start_date).to.equal("20170216");
    chai.expect(calendars[1].end_date).to.equal("20170228");
    chai.expect(calendars[2].start_date).to.equal("20170102");
    chai.expect(calendars[2].end_date).to.equal("20170315");
    chai.expect(calendars[3].start_date).to.equal("20170115");
    chai.expect(calendars[3].end_date).to.equal("20170215");
  });

  it("removes redundant calendars", () => {
    const schedules = [
      schedule(1, "A", "2017-01-01", "2017-01-31"),
      schedule(3, "B", "2017-01-01", "2017-01-31"),
      schedule(5, "C", "2017-01-01", "2017-01-31")
    ];

    const factory = new CalendarFactory();
    const [calendars] = factory.createCalendar(schedules);

    chai.expect(calendars.length).to.equal(1);
    chai.expect(calendars[0].start_date).to.equal("20170101");
    chai.expect(calendars[0].end_date).to.equal("20170131");
  });

});

function schedule(id: number, tuid: TUID, from: string, to: string): Schedule {
  return new Schedule(
    id,
    [],
    tuid,
    "",
    new ScheduleCalendar(
      moment(from),
      moment(to),
      { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 },
      1,
      {}
    ),
    RouteType.Rail,
    "LN",
    STP.Overlay
  );
}