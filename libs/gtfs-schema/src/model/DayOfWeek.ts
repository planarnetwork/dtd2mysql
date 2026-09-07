
/**
 * Index into a Days map: 0 = Sunday through to 6 = Saturday.
 *
 * This is deliberately not Temporal's numbering. Temporal.PlainDate.dayOfWeek is ISO
 * (1 = Monday .. 7 = Sunday) whereas the GTFS calendar columns and the CIF schedule rows are both
 * Sunday-first, so the conversion happens in PlainDate rather than at every call site.
 *
 * It has a file to itself, away from the functions that turn a Temporal.PlainDate into one, so that
 * a consumer can take the numbering without taking a declaration typed against Temporal. See
 * `scalars.ts`.
 */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;
