import {describe, it, expect} from 'vitest';
import {Days, ExcludeDays, OverlapType, ScheduleCalendar} from "../model/ScheduleCalendar";
import {ALL_DAYS} from "../transform/MergeSchedules.spec";
import {dayOfWeek, toYYYYMMDD} from "./PlainDate";

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

function calendar(from: string, to: string, days: Days = { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 },
                  exclude: string[] = []): ScheduleCalendar {
  return new ScheduleCalendar(
    Temporal.PlainDate.from(from),
    Temporal.PlainDate.from(to),
    days,
    exclude.reduce((all: ExcludeDays, date) => {
      all[date.replace(/-/g, "")] = Temporal.PlainDate.from(date);

      return all;
    }, {})
  );
}
describe("ScheduleCalendar identity", () => {

  it("does not depend on the order the exclude days were added", () => {
    const days = {...ALL_DAYS};
    const first = Temporal.PlainDate.from("2024-02-01");
    const second = Temporal.PlainDate.from("2024-01-15");

    const forwards = new ScheduleCalendar(
      Temporal.PlainDate.from("2024-01-01"),
      Temporal.PlainDate.from("2024-03-01"),
      days,
      {"20240201": first, "20240115": second}
    );

    const backwards = new ScheduleCalendar(
      Temporal.PlainDate.from("2024-01-01"),
      Temporal.PlainDate.from("2024-03-01"),
      days,
      {"20240115": second, "20240201": first}
    );

    expect(forwards.id).to.equal(backwards.id);
  });

  it("separates calendars that differ only in their exclude days", () => {
    const range = [Temporal.PlainDate.from("2024-01-01"), Temporal.PlainDate.from("2024-03-01")] as const;
    const day = Temporal.PlainDate.from("2024-02-01");

    const excluded = new ScheduleCalendar(range[0], range[1], {...ALL_DAYS}, {"20240201": day});
    const included = new ScheduleCalendar(range[0], range[1], {...ALL_DAYS}, {});

    expect(excluded.id).to.not.equal(included.id);
  });

});

describe("ScheduleCalendar.intersect", () => {

  it("keeps the days both calendars run", () => {
    const result = calendar("2017-07-10", "2017-07-31", WEEKDAYS)
      .intersect(calendar("2017-07-20", "2017-08-10"));

    expect(result.runsFrom.equals("20170720")).to.be.true;
    expect(result.runsTo.equals("20170731")).to.be.true;
    expect(result.days).to.deep.equal(WEEKDAYS);
  });

  it("excludes a day either of them excludes", () => {
    const result = calendar("2017-07-10", "2017-07-31", undefined, ["2017-07-12"])
      .intersect(calendar("2017-07-10", "2017-07-31", undefined, ["2017-07-20"]));

    expect(Object.keys(result.excludeDays).sort()).to.deep.equal(["20170712", "20170720"]);
  });

  it("is empty where the ranges do not meet", () => {
    expect(calendar("2017-07-10", "2017-07-16").intersect(calendar("2017-08-10", "2017-08-16")).isEmpty).to.be.true;
  });

  it("is empty where the days do not meet", () => {
    expect(calendar("2017-07-10", "2017-07-31", WEEKDAYS)
      .intersect(calendar("2017-07-10", "2017-07-31", WEEKENDS)).isEmpty).to.be.true;
  });

  it("drops an exclusion falling outside the range it keeps", () => {
    const result = calendar("2017-07-10", "2017-07-31", undefined, ["2017-07-11"])
      .intersect(calendar("2017-07-20", "2017-07-31"));

    expect(result.excludeDays).to.deep.equal({});
  });

  // The one property that matters, checked by walking the dates rather than by reasoning about
  // ranges, masks and exclusions separately - it is the interaction between the three that a day
  // mask shifted the wrong way gets wrong.
  it("runs on exactly the dates both of them run on", () => {
    let checked = 0;

    for (const a of examples()) {
      for (const b of examples()) {
        const both = a.intersect(b);

        for (const date of everyDate("2017-06-01", "2017-08-27")) {
          expect(runsOn(both, date), `${toYYYYMMDD(date)} in ${name(a)} n ${name(b)}`)
            .to.equal(runsOn(a, date) && runsOn(b, date));
          checked++;
        }
      }
    }

    expect(checked).to.be.greaterThan(10000);
  });

});

const WEEKDAYS: Days = { 0: 0, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 0 };
const WEEKENDS: Days = { 0: 1, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 1 };
const SUNDAYS: Days = { 0: 1, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

/**
 * Ranges apart, touching, overlapping and contained, against day masks that do and do not meet, with
 * exclusions inside and outside the range - and one whose range is the wrong way round, which is
 * what an intersection that does not meet leaves behind.
 */
function examples(): ScheduleCalendar[] {
  return [
    calendar("2017-07-03", "2017-07-30"),
    calendar("2017-07-03", "2017-07-30", WEEKDAYS),
    calendar("2017-07-03", "2017-07-30", WEEKENDS),
    calendar("2017-07-03", "2017-07-30", SUNDAYS),
    calendar("2017-07-10", "2017-07-16"),
    calendar("2017-07-17", "2017-08-13", WEEKDAYS),
    calendar("2017-06-05", "2017-07-09"),
    calendar("2017-08-14", "2017-08-20"),
    calendar("2017-07-03", "2017-07-30", undefined, ["2017-07-05", "2017-07-19"]),
    calendar("2017-07-10", "2017-07-23", WEEKDAYS, ["2017-07-12", "2017-08-02"]),
    calendar("2017-07-30", "2017-07-03")
  ];
}

function* everyDate(from: string, to: string): Generator<Temporal.PlainDate> {
  const end = Temporal.PlainDate.from(to);

  for (let date = Temporal.PlainDate.from(from); Temporal.PlainDate.compare(date, end) <= 0;
       date = date.add({ days: 1 })) {
    yield date;
  }
}

function runsOn(calendar: ScheduleCalendar, date: Temporal.PlainDate): boolean {
  return Temporal.PlainDate.compare(date, calendar.runsFrom) >= 0
    && Temporal.PlainDate.compare(date, calendar.runsTo) <= 0
    && calendar.days[dayOfWeek(date)] === 1
    && !calendar.excludeDays[toYYYYMMDD(date)];
}

function name(calendar: ScheduleCalendar): string {
  return `${toYYYYMMDD(calendar.runsFrom)}..${toYYYYMMDD(calendar.runsTo)}/${calendar.binaryDays}`;
}
