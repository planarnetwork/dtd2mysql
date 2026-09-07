
export interface CalendarDate {
  service_id: number | string;
  date: string;
  exception_type: number;
}

/**
 * calendar_dates.txt, as it is written. Every field of CalendarDate is a column of it.
 */
export type CalendarDateRow = CalendarDate;
