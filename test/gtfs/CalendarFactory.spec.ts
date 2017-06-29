import * as chai from "chai";
import {Schedule, STP, TUID} from "../../src/gtfs/native/Schedule";
import {ScheduleCalendar} from "../../src/gtfs/native/ScheduleCalendar";
import moment = require("moment");
import {CalendarFactory} from "../../src/gtfs/CalendarFactory";

describe("CalendarFactory", () => {

  it("adds exclude days for short overlays", () => {
    const schedules = [
      schedule(1, "A", "2017-01-01", "2017-01-31"),
      schedule(2, "A", "2017-01-05", "2017-01-07")
    ];

    const calendars = CalendarFactory.createCalendar(schedules);

    chai.expect(calendars[0].runsFrom).to.deep.equal(moment("2017-01-01"));
    chai.expect(calendars[0].runsTo).to.deep.equal(moment("2017-01-31"));

    const excludeDays = Object.values(calendars[0].excludeDays);

    chai.expect(excludeDays.length).to.equal(3);
    chai.expect(excludeDays[0].toISOString()).to.deep.equal(moment("2017-01-05").toISOString());
    chai.expect(excludeDays[1].toISOString()).to.deep.equal(moment("2017-01-06").toISOString());
    chai.expect(excludeDays[2].toISOString()).to.deep.equal(moment("2017-01-07").toISOString());
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
      { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1 },
      1,
      {}
    ),
    STP.Permenant
  );
}