import * as chai from "chai";
import * as moment from "moment";
import {Days, OverlapType, ScheduleCalendar} from "../../../src/gtfs/native/ScheduleCalendar";

describe("ScheduleCalendar", () => {

  it("detects overlaps", () => {
    const perm = calendar("2017-01-01", "2017-01-31");
    const underlay = calendar("2016-12-05", "2017-01-09");
    const innerlay = calendar("2017-01-05", "2017-01-07");
    const overlay = calendar("2017-01-31", "2017-02-07");
    const nolay = calendar("2017-02-05", "2017-02-07");

    chai.expect(perm.getOverlap(underlay)).to.deep.equal(OverlapType.Long);
    chai.expect(perm.getOverlap(innerlay)).to.deep.equal(OverlapType.Short);
    chai.expect(perm.getOverlap(overlay)).to.deep.equal(OverlapType.Short);
    chai.expect(perm.getOverlap(nolay)).to.deep.equal(OverlapType.None);
  });

  it("does not detect overlaps when the days don't match", () => {
    const weekday = calendar("2017-01-01", "2017-01-31", { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 0 });
    const weekend = calendar("2017-01-01", "2017-01-31", { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 1 });
    const tuesday = calendar("2017-01-01", "2017-01-31", { 0: 0, 1: 0, 2: 1, 3: 0, 4: 0, 5: 0, 6: 0 });

    chai.expect(weekday.getOverlap(weekend)).to.deep.equal(OverlapType.None);
    chai.expect(weekend.getOverlap(weekday)).to.deep.equal(OverlapType.None);
    chai.expect(weekday.getOverlap(tuesday)).to.deep.equal(OverlapType.Short);
  });

  it("detects short overlays", () => {
    const perm = calendar("2017-01-01", "2017-01-31");
    // Wed + Thurs for two weeks
    const short = calendar("2017-01-11", "2017-01-19", { 0: 0, 1: 0, 2: 0, 3: 1, 4: 1, 5: 0, 6: 0 });
    // full two weeks
    const long = calendar("2017-01-11", "2017-01-19");

    chai.expect(perm.getOverlap(short)).to.deep.equal(OverlapType.Short);
    chai.expect(perm.getOverlap(long)).to.deep.equal(OverlapType.Long);
  });

  it("adds exclude days", () => {
    const perm = calendar("2017-01-01", "2017-01-31");
    const overlay = calendar("2017-01-20", "2017-01-21");

    const [calendar1] = perm.addExcludeDays(overlay);
    const excludeDays = Object.keys(calendar1.excludeDays);

    chai.expect(excludeDays[0]).to.equal("20170120");
    chai.expect(excludeDays[1]).to.equal("20170121");
  });

  it("adds exclude days only within the range of the original date range", () => {
    const perm = calendar("2017-01-05", "2017-01-31");
    const underlay = calendar("2017-01-01", "2017-01-07");
    const overlay = calendar("2017-01-30", "2017-02-07");

    const [calendar1] = perm.addExcludeDays(underlay);
    const [calendar2] = calendar1.addExcludeDays(overlay);
    const excludeDays = Object.keys(calendar2.excludeDays);

    chai.expect(excludeDays.length).to.equal(0);
    chai.expect(calendar2.runsFrom.isSame("20170108")).to.be.true;
    chai.expect(calendar2.runsTo.isSame("20170129")).to.be.true;
  });

  it("adding exclude days might remove the schedule", () => {
    const perm = calendar("2017-01-01", "2017-01-15", { 0: 1, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 });
    const c1 = calendar("2017-01-01", "2017-01-07", { 0: 1, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 });
    const c2 = calendar("2017-01-08", "2017-01-15", { 0: 1, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 });

    const [calendar1] = perm.addExcludeDays(c1);

    chai.expect(calendar1.runsFrom.isSame("20170108")).to.be.true;
    chai.expect(calendar1.runsTo.isSame("20170115")).to.be.true;

    const calendars = calendar1.addExcludeDays(c2);

    chai.expect(calendars.length).to.equal(0);
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
    chai.expect(calendars[0].runsFrom.isSame("2017-01-05")).to.be.true;
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
    chai.expect(calendars[0].runsFrom.isSame("2017-01-05")).to.be.true;
    chai.expect(calendars[0].runsTo.isSame("2017-01-14")).to.be.true;
    chai.expect(calendars[1].runsFrom.isSame("2017-01-21")).to.be.true;
    chai.expect(calendars[1].runsTo.isSame("2017-01-31")).to.be.true;
  });

  it("partially degrades the services", () => {
    const perm = calendar("2017-01-01", "2017-01-31");
    // Wed + Thurs for two weeks
    const underlay = calendar("2017-01-11", "2017-01-19", { 0: 0, 1: 0, 2: 0, 3: 1, 4: 1, 5: 0, 6: 0 });

    const calendars = perm.divideAround(underlay);
    chai.expect(calendars[0].runsFrom.isSame("2017-01-01")).to.be.true;
    chai.expect(calendars[0].runsTo.isSame("2017-01-10")).to.be.true;
    chai.expect(calendars[1].runsFrom.isSame("2017-01-20")).to.be.true;
    chai.expect(calendars[1].runsTo.isSame("2017-01-31")).to.be.true;
    chai.expect(calendars[2].days).to.deep.equal({0: 1, 1: 1, 2: 1, 3: 0, 4: 0, 5: 1, 6: 1});
    // days where the service is not running are removed
    chai.expect(calendars[2].runsFrom.isSame("2017-01-13")).to.be.true;
    chai.expect(calendars[2].runsTo.isSame("2017-01-17")).to.be.true;
  });

  it("degrades the service to the point where it doesn't run", () => {
    // Monday + Friday service
    const perm = calendar("2017-01-02", "2017-01-30", { 0: 0, 1: 1, 2: 0, 3: 0, 4: 0, 5: 1, 6: 0 });
    // Remove a Monday
    const underlay = calendar("2017-01-15", "2017-01-19", { 0: 0, 1: 1, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 });

    const calendars = perm.divideAround(underlay);

    chai.expect(calendars.length).to.equal(2);
    chai.expect(calendars[0].runsFrom.isSame("2017-01-02")).to.be.true;
    chai.expect(calendars[0].runsTo.isSame("2017-01-13")).to.be.true;
    chai.expect(calendars[1].runsFrom.isSame("2017-01-20")).to.be.true;
    chai.expect(calendars[1].runsTo.isSame("2017-01-30")).to.be.true;
  });

  it("detects when a calendar can be merged with another", () => {
    // Monday + Friday service
    const c1 = calendar("2017-07-03", "2017-07-14", { 0: 0, 1: 1, 2: 0, 3: 0, 4: 0, 5: 1, 6: 0 });
    const c2 = calendar("2017-07-17", "2017-07-21", { 0: 0, 1: 1, 2: 0, 3: 0, 4: 0, 5: 1, 6: 0 });
    const c3 = calendar("2017-10-13", "2017-10-16", { 0: 0, 1: 1, 2: 0, 3: 0, 4: 0, 5: 1, 6: 0 });

    chai.expect(c1.canMerge(c2)).to.be.true;
    chai.expect(c1.canMerge(c3)).to.be.false;
  });

  it("can merge with another calendar", () => {
    // Monday + Friday service
    const c1 = calendar("2017-07-03", "2017-07-14", { 0: 0, 1: 1, 2: 0, 3: 0, 4: 0, 5: 1, 6: 0 });
    c1.excludeDays["20170710"] = moment("20170710");

    const c2 = calendar("2017-07-17", "2017-07-28", { 0: 0, 1: 1, 2: 0, 3: 0, 4: 0, 5: 1, 6: 0 });
    c2.excludeDays["20170721"] = moment("20170721");

    const c3 = c1.merge(c2);

    chai.expect(c3.runsFrom.isSame(c1.runsFrom)).to.be.true;
    chai.expect(c3.runsTo.isSame(c2.runsTo)).to.be.true;
    chai.expect(c3.excludeDays["20170710"]).to.not.be.undefined;
    chai.expect(c3.excludeDays["20170721"]).to.not.be.undefined;
  });

  it("can merge with an overlapping calendar", () => {
    // Monday + Friday service
    const c1 = calendar("2017-07-03", "2017-07-28", { 0: 0, 1: 1, 2: 0, 3: 0, 4: 0, 5: 1, 6: 0 });
    c1.excludeDays["20170717"] = moment("20170717");
    c1.excludeDays["20170721"] = moment("20170721");

    const c2 = calendar("2017-07-17", "2017-07-28", { 0: 0, 1: 1, 2: 0, 3: 0, 4: 0, 5: 1, 6: 0 });
    c2.excludeDays["20170721"] = moment("20170721");

    const c3 = c1.merge(c2);

    chai.expect(c3.runsFrom.isSame(c1.runsFrom)).to.be.true;
    chai.expect(c3.runsTo.isSame(c1.runsTo)).to.be.true;
    chai.expect(Object.keys(c3.excludeDays).length).to.equal(1);
    chai.expect(c3.excludeDays["20170721"]).to.not.be.undefined;
  });

  it("can bridge the gap between a merging service with exclude days", () => {
    // Monday + Friday service
    const c1 = calendar("2017-07-03", "2017-07-14", { 0: 0, 1: 1, 2: 0, 3: 0, 4: 0, 5: 1, 6: 0 });
    c1.excludeDays["20170710"] = moment("20170710");

    const c2 = calendar("2017-07-21", "2017-07-28", { 0: 0, 1: 1, 2: 0, 3: 0, 4: 0, 5: 1, 6: 0 });
    c2.excludeDays["20170721"] = moment("20170721");

    const c3 = c1.merge(c2);

    chai.expect(c3.runsFrom.isSame(c1.runsFrom)).to.be.true;
    chai.expect(c3.runsTo.isSame(c2.runsTo)).to.be.true;
    chai.expect(c3.excludeDays["20170710"]).to.not.be.undefined;
    chai.expect(c3.excludeDays["20170717"]).to.not.be.undefined;
    chai.expect(c3.excludeDays["20170721"]).to.not.be.undefined;
  });

  it("shift forward", () => {
    // Monday + Saturday service
    const c1 = calendar("2017-07-03", "2017-07-14", { 0: 0, 1: 1, 2: 0, 3: 0, 4: 0, 5: 0, 6: 1 });
    c1.excludeDays["20170710"] = moment("20170710");

    const c2 = c1.shiftForward();

    chai.expect(c2.days).to.deep.equal({ 0: 1, 1: 0, 2: 1, 3: 0, 4: 0, 5: 0, 6: 0 });
    chai.expect(c2.runsFrom.isSame("20170704")).to.be.true;
    chai.expect(c2.runsTo.isSame("20170715")).to.be.true;
    chai.expect(c2.excludeDays["20170710"]).to.be.undefined;
    chai.expect(c2.excludeDays["20170711"]).to.not.be.undefined;
  });

  it("shift backward", () => {
    // Sunday + Friday service
    const c1 = calendar("2017-07-02", "2017-07-14", { 0: 1, 1: 0, 2: 0, 3: 0, 4: 0, 5: 1, 6: 0 });
    c1.excludeDays["20170709"] = moment("20170709");

    const c2 = c1.shiftBackward();

    chai.expect(c2.days).to.deep.equal({ 0: 0, 1: 0, 2: 0, 3: 0, 4: 1, 5: 0, 6: 1 });
    chai.expect(c2.runsFrom.isSame("20170701")).to.be.true;
    chai.expect(c2.runsTo.isSame("20170713")).to.be.true;
    chai.expect(c2.excludeDays["20170709"]).to.be.undefined;
    chai.expect(c2.excludeDays["20170708"]).to.not.be.undefined;
  });

});

function calendar(from: string, to: string, days: Days = { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 }): ScheduleCalendar {
  return new ScheduleCalendar(
    moment(from),
    moment(to),
    days,
    {}
  );
}