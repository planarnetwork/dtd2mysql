/**
 * Convert a date to a GTFS date string
 */
export function toGTFSDate(date: Date): string {
  return date.getFullYear()
    + (date.getMonth() + 1).toString().padStart(2, "0")
    + date.getDate().toString().padStart(2, "0");
}
