/**
 * Days planned by default.
 *
 * A pattern set is built for a date: the network is filtered to the trips running that day, so a
 * pattern only exists if something ran it. A week covers every shape of day the timetable has -
 * each weekday, the Saturday and the Sunday - without having to decide which of them differ.
 *
 * The union is what gets published, so a pattern found on any of these days is available to plan
 * with on all of them. That is the right way round: a pattern the planner does not hold is a
 * journey it cannot offer, while one whose trains do not run that day costs a scan that finds
 * nothing.
 */
const DEFAULT_DAYS = 7;

/**
 * The week beginning at `from`.
 */
export function defaultDates(from: Date): Date[] {
  const start = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));

  return Array.from({length: DEFAULT_DAYS}, (_, day) => {
    const date = new Date(start);

    date.setUTCDate(date.getUTCDate() + day);

    return date;
  });
}

/**
 * Read a comma separated list of `YYYY-MM-DD`.
 */
export function parseDates(text: string | undefined, from: Date): Date[] {
  if (text === undefined) {
    return defaultDates(from);
  }

  return text.split(",").map(part => {
    const value = part.trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new Error(`--dates wants YYYY-MM-DD, comma separated, not "${value}".`);
    }

    const date = new Date(`${value}T00:00:00Z`);

    if (Number.isNaN(date.getTime())) {
      throw new Error(`"${value}" is not a date.`);
    }

    return date;
  });
}

/**
 * `YYYY-MM-DD`, which is how a date is written in a message and in the meta file.
 */
export function toISODate(date: Date): string {
  return date.toISOString().slice(0, "YYYY-MM-DD".length);
}

/**
 * Reject a date the feed says nothing about, rather than letting the scan fail on the first
 * station with a message about a calendar window.
 *
 * A feed built with a three month range covers every default date. One given by hand might not, and
 * finding that out after an hour of scanning is a bad way to find it out.
 */
export function checkWithinFeed(dates: readonly Date[], startDate?: number, endDate?: number): void {
  if (startDate === undefined || endDate === undefined) {
    return;
  }

  const outside = dates.filter(date => {
    const at = toDateNumber(date);

    return at < startDate || at > endDate;
  });

  if (outside.length > 0) {
    throw new Error(
      `The feed covers ${startDate} to ${endDate}, which does not include ` +
      `${outside.map(toISODate).join(", ")}.`
    );
  }
}

/**
 * `YYYYMMDD` as a number, which is how a feed writes a date.
 */
export function toDateNumber(date: Date): number {
  return Number(toISODate(date).replaceAll("-", ""));
}
