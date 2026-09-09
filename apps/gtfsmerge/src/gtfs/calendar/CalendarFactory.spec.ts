import {describe, it, expect} from "vitest";
import {CalendarDateRow, CalendarRow} from "@gb-transit/gtfs-schema";
import {CalendarFactory} from "./CalendarFactory";
import {addDays, getDayOfWeek} from "@gb-transit/gtfs-loader";

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

const runs = (date: string): CalendarDateRow => ({service_id: 1, exception_type: 1, date});
const doesNot = (date: string): CalendarDateRow => ({service_id: 1, exception_type: 2, date});

/**
 * The dates a calendar and its exceptions describe, read the way the
 * specification says to read them: the days of the week inside the range, plus
 * the dates added, minus the dates removed.
 */
function datesOf(calendar: CalendarRow, exceptions: CalendarDateRow[]): string[] {
  const dates = new Set<string>();
  const end = Number(calendar.end_date);

  for (let date = Number(calendar.start_date); date <= end; date = addDays(date, 1)) {
    if (calendar[DAYS[getDayOfWeek(date)]]) {
      dates.add(String(date));
    }
  }

  for (const exception of exceptions) {
    if (Number(exception.exception_type) === 1) {
      dates.add(String(exception.date));
    }
    else {
      dates.delete(String(exception.date));
    }
  }

  return [...dates].sort();
}

describe("CalendarFactory", () => {
  const factory = new CalendarFactory();

  it("sets the start and end date", () => {
    const [calendar] = factory.create("1", [runs("20190615"), runs("20190515"), runs("20190520")]);

    expect(calendar.start_date).to.deep.equal("20190515");
    expect(calendar.end_date).to.deep.equal("20190615");
  });

  it("does not enable days where the service is not running", () => {
    const [calendar] = factory.create("1", [
      runs("20190615"), runs("20190515"), runs("20190522"),
      runs("20190529"), runs("20190605"), runs("20190520")
    ]);

    expect(calendar.monday).to.deep.equal(0);
    expect(calendar.tuesday).to.deep.equal(0);
    expect(calendar.wednesday).to.deep.equal(1);
    expect(calendar.thursday).to.deep.equal(0);
    expect(calendar.friday).to.deep.equal(0);
    expect(calendar.saturday).to.deep.equal(0);
    expect(calendar.sunday).to.deep.equal(0);
  });

  it("adds exception days", () => {
    const [, calendarDates] = factory.create("1", [
      runs("20190615"), runs("20190515"), runs("20190522"),
      runs("20190529"), runs("20190605"), runs("20190520")
    ]);

    expect(calendarDates[0].date).to.deep.equal("20190520");
    expect(calendarDates[1].date).to.deep.equal("20190612");
    expect(calendarDates[2].date).to.deep.equal("20190615");
  });

  /**
   * A feed lists both the dates a service runs and the dates it does not, and
   * only the first kind is a date it runs on. Read as a date it runs on, a
   * removal put buses on the road on Christmas Day.
   */
  it("does not turn a removed date into a running one", () => {
    const dates = [runs("20260907"), runs("20260914"), doesNot("20260921")];
    const [calendar, exceptions] = factory.create("1", dates);

    expect(datesOf(calendar, exceptions)).to.deep.equal(["20260907", "20260914"]);
  });

  it("excludes a removed date the calendar's own days would include", () => {
    // Five Mondays, the middle one removed, so the calendar runs Mondays and the
    // removal has to come back out as an exception.
    const dates = [
      runs("20260907"), runs("20260914"), doesNot("20260921"), runs("20260928"), runs("20261005")
    ];
    const [calendar, exceptions] = factory.create("1", dates);

    expect(calendar.monday).to.equal(1);
    expect(exceptions.map(e => `${e.date}:${e.exception_type}`)).to.deep.equal(["20260921:2"]);
    expect(datesOf(calendar, exceptions))
      .to.deep.equal(["20260907", "20260914", "20260928", "20261005"]);
  });

  it("keeps the range to the days the service runs", () => {
    const [calendar] = factory.create("1", [
      doesNot("20260831"), runs("20260907"), runs("20260914"), doesNot("20260921")
    ]);

    expect(calendar.start_date).to.equal("20260907");
    expect(calendar.end_date).to.equal("20260914");
  });

  /**
   * Told only when it does not run, a service never runs. It still needs a row,
   * because the trips are indexed against its id until CalendarMerger drops it.
   */
  it("gives a service of nothing but removals a calendar of no days", () => {
    const [calendar, exceptions] = factory.create("1", [doesNot("20260921"), doesNot("20260928")]);

    expect(DAYS.map(day => calendar[day])).to.deep.equal([0, 0, 0, 0, 0, 0, 0]);
    expect(exceptions).to.deep.equal([]);
    expect(datesOf(calendar, exceptions)).to.deep.equal([]);
  });

  /**
   * Whatever it decides about the days of the week, the answer has to be the
   * dates it was given.
   */
  it("describes exactly the dates it was given", () => {
    const dates = [
      runs("20260907"), runs("20260908"), runs("20260909"), runs("20260910"), runs("20260911"),
      doesNot("20260912"), doesNot("20260913"), runs("20260914"), runs("20260916"),
      runs("20260921"), runs("20260923"), runs("20260928"), runs("20260930")
    ];
    const [calendar, exceptions] = factory.create("1", dates);

    expect(datesOf(calendar, exceptions)).to.deep.equal(
      dates.filter(d => d.exception_type === 1).map(d => String(d.date)).sort()
    );
  });
});
