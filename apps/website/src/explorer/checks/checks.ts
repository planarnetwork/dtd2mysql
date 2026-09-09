import type {Check} from "./Check.js";
import {INTEGRITY_CHECKS} from "./Integrity.js";
import {GEOGRAPHY_CHECKS} from "./Geography.js";
import {TIME_CHECKS} from "./Times.js";
import {CALENDAR_CHECKS} from "./Calendars.js";

/**
 * Everything the explorer knows how to ask about a feed.
 *
 * The point of a registry is that a question answered once becomes a question answered forever.
 * Somebody works out why a station was in the wrong place; the check that would have found it goes
 * in here, and the next time it happens nobody has to work it out again.
 *
 * Adding one is adding an entry to a group and a spec beside it. An id is in URLs and in the issue
 * links people paste, so do not rename one.
 */
export const CHECKS: readonly Check[] = [
  ...INTEGRITY_CHECKS,
  ...GEOGRAPHY_CHECKS,
  ...TIME_CHECKS,
  ...CALENDAR_CHECKS
];

/** The groups, for a page that lists them under headings. */
export const CHECK_GROUPS: readonly {title: string, blurb: string, checks: readonly Check[]}[] = [
  {
    title: "Integrity",
    blurb: "Whether everything the feed names actually exists.",
    checks: INTEGRITY_CHECKS
  },
  {
    title: "Geography",
    blurb: "Whether everything is where it says it is.",
    checks: GEOGRAPHY_CHECKS
  },
  {
    title: "Time",
    blurb: "Whether time runs forwards, and how far past midnight it goes.",
    checks: TIME_CHECKS
  },
  {
    title: "Calendars",
    blurb: "Whether the days a service runs are the days somebody meant.",
    checks: CALENDAR_CHECKS
  }
];

export function checkOf(id: string): Check | undefined {
  return CHECKS.find(check => check.id === id);
}
