
/**
 * The Temporal.PlainDate operations this project needs that Temporal itself does not provide.
 */

/**
 * Index into a Days map: 0 = Sunday through to 6 = Saturday.
 *
 * This is deliberately not Temporal's numbering. Temporal.PlainDate.dayOfWeek is ISO
 * (1 = Monday .. 7 = Sunday) whereas the GTFS calendar columns and the CIF schedule rows are both
 * Sunday-first, so the conversion happens here rather than at every call site.
 */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export function dayOfWeek(date: Temporal.PlainDate): DayOfWeek {
  return (date.dayOfWeek % 7) as DayOfWeek;
}

export function compare(a: Temporal.PlainDate, b: Temporal.PlainDate): number {
  return Temporal.PlainDate.compare(a, b);
}

export function maxDate(a: Temporal.PlainDate, b: Temporal.PlainDate): Temporal.PlainDate {
  return compare(a, b) >= 0 ? a : b;
}

export function minDate(a: Temporal.PlainDate, b: Temporal.PlainDate): Temporal.PlainDate {
  return compare(a, b) <= 0 ? a : b;
}

/**
 * The 1st of January in the year of the given date
 */
export function startOfYear(date: string): Temporal.PlainDate {
  return Temporal.PlainDate.from(date).with({ month: 1, day: 1 });
}

/**
 * Given a short form restriction month MMDD this method will return the first instance of that date that occurs
 * after the given date. For example with a restriction date of 2017-06-01 the earliest date of 0301 is 2018-03-01.
 *
 * Returns undefined when the restriction month is not a real date in the resulting year - 0229 outside a leap
 * year, say. moment returned an invalid date for those and the caller tested isValid(); Temporal rejects them.
 */
export function getFirstDateAfter(earliestDate: Temporal.PlainDate, restrictionMonth: string): Temporal.PlainDate | undefined {
  const month = +restrictionMonth.slice(0, 2);
  const day = +restrictionMonth.slice(2);
  const yearOffset = (earliestDate.month > month || (earliestDate.month === month && earliestDate.day > day)) ? 1 : 0;

  try {
    return Temporal.PlainDate.from({ year: earliestDate.year + yearOffset, month, day }, { overflow: "reject" });
  }
  catch {
    return undefined;
  }
}

/**
 * Format as YYYYMMDD, the form GTFS uses for calendar dates and this project uses to key exclude days
 */
export function toYYYYMMDD(date: Temporal.PlainDate): string {
  return pad(date.year, 4) + pad(date.month, 2) + pad(date.day, 2);
}

function pad(value: number, length: number): string {
  return value.toString().padStart(length, "0");
}
