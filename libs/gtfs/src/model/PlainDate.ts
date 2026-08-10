
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
 * Format as YYYYMMDD, the form GTFS uses for calendar dates and this project uses to key exclude days
 */
export function toYYYYMMDD(date: Temporal.PlainDate): string {
  return pad(date.year, 4) + pad(date.month, 2) + pad(date.day, 2);
}

function pad(value: number, length: number): string {
  return value.toString().padStart(length, "0");
}
