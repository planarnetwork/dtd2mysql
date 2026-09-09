/**
 * Today, as a GTFS date, in the timezone of whoever is running the merge.
 *
 * Local rather than UTC on purpose, and it is the only date here that should be:
 * the default `--date-filter` means "do not carry what has already finished",
 * and what has finished is a question about the caller's day, not about the day
 * in Greenwich. Stepping from one calendar date to the next is a different
 * question with a different answer, and `addDays` in `@gb-transit/gtfs-loader`
 * is where that lives - it works in UTC so that a clock change cannot move a
 * date onto the day either side of it.
 */
export function toGTFSDate(date: Date): string {
  return (
    date.getFullYear() +
    (date.getMonth() + 1).toString().padStart(2, "0") +
    date.getDate().toString().padStart(2, "0")
  );
}
