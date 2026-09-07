
/**
 * The Temporal.PlainDate operations this project needs that Temporal itself does not provide.
 */

import type { DayOfWeek } from "./DayOfWeek.js";

export type { DayOfWeek };

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
