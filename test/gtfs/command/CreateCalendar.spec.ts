import * as chai from "chai";
import {createCalendar} from "../../../src/gtfs/command/CreateCalendar";
import {STP} from "../../../src/gtfs/native/OverlayRecord";
import {schedule} from "./MergeSchedules.spec";

describe("CreateCalendar", () => {

  it("returns unique calendar entries", () => {
    const schedules = [
      schedule(1, "A", "2017-01-01", "2017-01-31"),
      schedule(3, "B", "2017-01-01", "2017-01-31"),
      schedule(5, "C", "2017-01-01", "2017-01-31")
    ];

    const [calendars] = createCalendar(schedules);

    chai.expect(calendars.length).to.equal(1);
    chai.expect(calendars[0].start_date).to.equal("20170101");
    chai.expect(calendars[0].end_date).to.equal("20170131");
  });

  it("creates the serviceId index", () => {
    const schedule1 = schedule(1, "A", "2017-01-01", "2017-01-31");
    const schedule2 = schedule(3, "B", "2017-01-01", "2017-01-31");
    const schedule3 = schedule(5, "C", "2017-01-01", "2017-01-31");
    const schedule4 = schedule(7, "D", "2017-01-01", "2017-01-31", STP.Overlay, { 0: 0, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 0 });

    const schedules = [schedule1, schedule2, schedule3, schedule4];

    const [calendars, _, index] = createCalendar(schedules);

    chai.expect(index[schedule1.calendar.id]).to.equal(1);
    chai.expect(index[schedule2.calendar.id]).to.equal(1);
    chai.expect(index[schedule3.calendar.id]).to.equal(1);
    chai.expect(index[schedule4.calendar.id]).to.equal(2);
  });

});
