
/**
 * A duration in seconds
 */
export type Duration = number;

export const SECONDS_IN_DAY = 86400;

export function formatDuration(duration: number): string {
  const hours = Math.floor(duration / 3600);
  const hoursFormatted = hours < 10 ? "0" + hours : hours;
  const mins = Math.floor((duration % 3600) / 60);
  const minsFormatted = mins < 10 ? "0" + mins : mins;

  return `${hoursFormatted}:${minsFormatted}:00`;
}

/**
 * Parse a "HH:MM" or "HH:MM:SS" time into seconds.
 *
 * Hours are not capped at 24 - GTFS uses times like "25:30:00" for stops that fall after midnight -
 * so this deliberately does not go via Temporal.PlainTime.
 */
export function parseDuration(time: string): Duration {
  const [hours, minutes, seconds = "0"] = time.split(":");
  const duration = (+hours * 3600) + (+minutes * 60) + +seconds;

  if (Number.isNaN(duration)) {
    throw new Error(`Unable to parse duration: ${time}`);
  }

  return duration;
}
