import * as chai from "chai";
import moment = require("moment");
import {Days, ScheduleCalendar} from "../../../src/gtfs/native/ScheduleCalendar";

describe("ScheduleCalendar", () => {

  it("adds exclude days for bank holidays", () => {
    const perm = calendar("2017-01-01", "2017-01-31", { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 }, 0);
    const bankHolidays = [moment("2017-01-01"), moment("2017-08-31")];

    perm.addBankHolidays(bankHolidays);

    const excludeDays = Object.keys(perm.excludeDays);

    chai.expect(excludeDays.length).to.equal(1);
    chai.expect(excludeDays[0]).to.equal("20170101");
  });

  it("ignore bank holiday exceptions if running on bank holidays", () => {
    const perm = calendar("2017-01-01", "2017-01-31");
    const bankHolidays = [moment("2017-01-01"), moment("2017-08-31")];

    perm.addBankHolidays(bankHolidays);

    chai.expect(Object.keys(perm.excludeDays).length).to.equal(0);
  });

  it("detects overlaps", () => {
    const perm = calendar("2017-01-01", "2017-01-31");
    const underlay = calendar("2016-12-05", "2017-01-07");
    const innerlay = calendar("2017-01-05", "2017-01-07");
    const overlay = calendar("2017-01-31", "2017-02-07");
    const nolay = calendar("2017-02-05", "2017-02-07");

    chai.expect(underlay.overlaps(perm)).to.be.true;
    chai.expect(innerlay.overlaps(perm)).to.be.true;
    chai.expect(overlay.overlaps(perm)).to.be.true;
    chai.expect(nolay.overlaps(perm)).to.be.false;
  });

  it("does not detect overlaps when the days don't match", () => {
    const weekday = calendar("2017-01-01", "2017-01-31", { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 0 });
    const weekend = calendar("2017-01-01", "2017-01-31", { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 1 });
    const tuesday = calendar("2017-01-01", "2017-01-31", { 0: 0, 1: 0, 2: 1, 3: 0, 4: 0, 5: 0, 6: 0 });

    chai.expect(weekend.overlaps(weekday)).to.be.false;
    chai.expect(weekday.overlaps(weekend)).to.be.false;
    chai.expect(tuesday.overlaps(weekday)).to.be.true;
  });

  it("adds exclude days", () => {
    const perm = calendar("2017-01-01", "2017-01-31");
    const overlay = calendar("2017-01-30", "2017-02-07");

    perm.addExcludeDays(overlay);
    const excludeDays = Object.keys(perm.excludeDays);

    chai.expect(excludeDays[0]).to.equal("20170130");
    chai.expect(excludeDays[1]).to.equal("20170131");
  });

  it("adds exclude days only within the range of the original date range", () => {
    const perm = calendar("2017-01-05", "2017-01-31");
    const underlay = calendar("2017-01-01", "2017-01-07");
    const overlay = calendar("2017-01-30", "2017-02-07");

    perm.addExcludeDays(underlay);
    perm.addExcludeDays(overlay);
    const excludeDays = Object.keys(perm.excludeDays);

    chai.expect(excludeDays[0]).to.equal("20170105");
    chai.expect(excludeDays[1]).to.equal("20170106");
    chai.expect(excludeDays[2]).to.equal("20170107");
    chai.expect(excludeDays[3]).to.equal("20170130");
    chai.expect(excludeDays[4]).to.equal("20170131");
  });

  it("divides around a date range spanning the beginning", () => {
    const perm = calendar("2017-01-05", "2017-01-31");
    const underlay = calendar("2017-01-01", "2017-01-07");

    const calendars = perm.divideAround(underlay);
    chai.expect(calendars[0].runsFrom.isSame("2017-01-08")).to.be.true;
    chai.expect(calendars[0].runsTo.isSame("2017-01-31")).to.be.true;
  });

  it("divides around a date range spanning the end", () => {
    const perm = calendar("2017-01-05", "2017-01-31");
    const underlay = calendar("2017-01-29", "2017-02-07");

    const calendars = perm.divideAround(underlay);
    chai.expect(calendars[0].runsFrom.isSame("2017-01-05")).to.be.be.true;
    chai.expect(calendars[0].runsTo.isSame("2017-01-28")).to.be.true;
  });

  it("divides around a date range and creates the smallest date range possible", () => {
    // this is based of a real world scenario using the C29405
    const perm = calendar("2017-05-26", "2017-06-30", { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 1, 6: 0});
    const underlay = calendar("2017-06-26", "2017-06-30");

    const calendars = perm.divideAround(underlay);

    chai.expect(calendars[0].runsFrom.isSame("2017-05-26")).to.be.true;
    chai.expect(calendars[0].runsTo.isSame("2017-06-23")).to.be.true;
  });

  it("divides around a date range in the middle", () => {
    const perm = calendar("2017-01-05", "2017-01-31");
    const underlay = calendar("2017-01-15", "2017-01-20");

    const calendars = perm.divideAround(underlay);
    chai.expect(calendars[0].runsFrom.isSame("2017-01-05")).to.be.be.true;
    chai.expect(calendars[0].runsTo.isSame("2017-01-14")).to.be.true;
    chai.expect(calendars[1].runsFrom.isSame("2017-01-21")).to.be.be.true;
    chai.expect(calendars[1].runsTo.isSame("2017-01-31")).to.be.true;
  });

});

function calendar(from: string, to: string, days: Days = { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 }, bankHoliday: 0 | 1 = 1): ScheduleCalendar {
  return new ScheduleCalendar(
    moment(from),
    moment(to),
    days,
    bankHoliday,
    {}
  );
}