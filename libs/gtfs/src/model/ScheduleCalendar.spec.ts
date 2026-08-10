import {describe, it, expect} from 'vitest';
import {Days, OverlapType, ScheduleCalendar} from "../model/ScheduleCalendar";

describe("ScheduleCalendar", () => {

  it("detects overlaps", () => {
    const perm = calendar("2017-01-01", "2017-01-31");
    const underlay = calendar("2016-12-05", "2017-01-09");
    const innerlay = calendar("2017-01-05", "2017-01-07");
    const overlay = calendar("2017-01-31", "2017-02-07");
    const nolay = calendar("2017-02-05", "2017-02-07");

    expect(perm.getOverlap(underlay)).to.deep.equal(OverlapType.Overlap);
    expect(perm.getOverlap(innerlay)).to.deep.equal(OverlapType.Overlap);
    expect(perm.getOverlap(overlay)).to.deep.equal(OverlapType.Overlap);
    expect(perm.getOverlap(nolay)).to.deep.equal(OverlapType.None);
  });

  it("does not detect overlaps when the days don't match", () => {
    const weekday = calendar("2017-01-01", "2017-01-31", { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 0 });
    const weekend = calendar("2017-01-01", "2017-01-31", { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 1 });
    const tuesday = calendar("2017-01-01", "2017-01-31", { 0: 0, 1: 0, 2: 1, 3: 0, 4: 0, 5: 0, 6: 0 });

    expect(weekday.getOverlap(weekend)).to.deep.equal(OverlapType.None);
    expect(weekend.getOverlap(weekday)).to.deep.equal(OverlapType.None);
    expect(weekday.getOverlap(tuesday)).to.deep.equal(OverlapType.Overlap);
  });

  it("detects short overlays", () => {
    const perm = calendar("2017-01-01", "2017-01-31");
    // Wed + Thurs for two weeks
    const short = calendar("2017-01-11", "2017-01-19", { 0: 0, 1: 0, 2: 0, 3: 1, 4: 1, 5: 0, 6: 0 });
    // full two weeks
    const long = calendar("2017-01-11", "2017-01-19");

    expect(perm.getOverlap(short)).to.deep.equal(OverlapType.Overlap);
    expect(perm.getOverlap(long)).to.deep.equal(OverlapType.Overlap);
  });

  it("adds exclude days", () => {
    const perm = calendar("2017-01-01", "2017-01-31");
    const overlay = calendar("2017-01-20", "2017-01-21");

    const calendar1 = perm.addExcludeDays(overlay);
    const excludeDays = Object.keys(calendar1!.excludeDays);

    expect(excludeDays[0]).to.equal("20170120");
    expect(excludeDays[1]).to.equal("20170121");
  });

  it("adds exclude days only within the range of the original date range", () => {
    const perm = calendar("2017-01-05", "2017-01-31");
    const underlay = calendar("2017-01-01", "2017-01-07");
    const overlay = calendar("2017-01-30", "2017-02-07");

    const calendar1 = perm.addExcludeDays(underlay);
    const calendar2 = calendar1!.addExcludeDays(overlay);
    const excludeDays = Object.keys(calendar2!.excludeDays);

    expect(excludeDays.length).to.equal(5);
    expect(calendar2!.runsFrom.equals("20170105")).to.be.true;
    expect(calendar2!.runsTo.equals("20170131")).to.be.true;
    expect(excludeDays[0]).to.equal("20170105");
    expect(excludeDays[1]).to.equal("20170106");
    expect(excludeDays[2]).to.equal("20170107");
    expect(excludeDays[3]).to.equal("20170130");
    expect(excludeDays[4]).to.equal("20170131");
  });

  it("adding exclude days might remove the schedule", () => {
    const perm = calendar("2017-01-01", "2017-01-15", { 0: 1, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 });
    const c1 = calendar("2017-01-01", "2017-01-07", { 0: 1, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 });
    const c2 = calendar("2017-01-08", "2017-01-15", { 0: 1, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 });

    const calendar1 = perm.addExcludeDays(c1)!;

    expect(calendar1.runsFrom.equals("20170101")).to.be.true;
    expect(calendar1.runsTo.equals("20170115")).to.be.true;

    const excludeDays = Object.keys(calendar1!.excludeDays);
    
    expect(excludeDays.length).to.equal(1);
    expect(excludeDays[0]).to.equal("20170101");

    const calendars = calendar1.addExcludeDays(c2);

    expect(calendars).null;
  });

  it("terminates when all dates have been removed from the schedule", () => {
    const saturdayOnly = calendar("2023-11-20", "2023-11-24", { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 1 });
    const result = saturdayOnly.clone(Temporal.PlainDate.from("2023-11-20"), Temporal.PlainDate.from("2023-11-24"));

    expect(result.isEmpty).to.be.true;
  });

  it("terminates when the schedule has no operating days at all", () => {
    const noDays = calendar("2023-11-20", "2023-11-24", { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 });
    const result = noDays.clone(Temporal.PlainDate.from("2023-11-20"), Temporal.PlainDate.from("2023-11-24"));

    expect(result.isEmpty).to.be.true;
  });

  it("shift forward", () => {
    // Monday + Saturday service
    const c1 = calendar("2017-07-03", "2017-07-14", { 0: 0, 1: 1, 2: 0, 3: 0, 4: 0, 5: 0, 6: 1 });
    c1.excludeDays["20170710"] = Temporal.PlainDate.from("20170710");

    const c2 = c1.shiftForward();

    expect(c2.days).to.deep.equal({ 0: 1, 1: 0, 2: 1, 3: 0, 4: 0, 5: 0, 6: 0 });
    expect(c2.runsFrom.equals("20170704")).to.be.true;
    expect(c2.runsTo.equals("20170715")).to.be.true;
    expect(c2.excludeDays["20170710"]).to.be.undefined;
    expect(c2.excludeDays["20170711"]).to.not.be.undefined;
  });

  it("shift backward", () => {
    // Sunday + Friday service
    const c1 = calendar("2017-07-02", "2017-07-14", { 0: 1, 1: 0, 2: 0, 3: 0, 4: 0, 5: 1, 6: 0 });
    c1.excludeDays["20170709"] = Temporal.PlainDate.from("20170709");

    const c2 = c1.shiftBackward();

    expect(c2.days).to.deep.equal({ 0: 0, 1: 0, 2: 0, 3: 0, 4: 1, 5: 0, 6: 1 });
    expect(c2.runsFrom.equals("20170701")).to.be.true;
    expect(c2.runsTo.equals("20170713")).to.be.true;
    expect(c2.excludeDays["20170709"]).to.be.undefined;
    expect(c2.excludeDays["20170708"]).to.not.be.undefined;
  });

});

function calendar(from: string, to: string, days: Days = { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 }): ScheduleCalendar {
  return new ScheduleCalendar(
    Temporal.PlainDate.from(from),
    Temporal.PlainDate.from(to),
    days,
    {}
  );
}