
export interface Calendar {
  service_id: string | number,
  monday: 0 | 1,
  tuesday: 0 | 1,
  wednesday: 0 | 1,
  thursday: 0 | 1,
  friday: 0 | 1,
  saturday: 0 | 1,
  sunday: 0 | 1,
  start_date: string,
  end_date: string,
}

/**
 * calendar.txt, as it is written. Every field of Calendar is a column of it.
 */
export type CalendarRow = Calendar;
