import type {Check} from "./Check.js";
import {ADDED} from "../model/Calendar.js";
import {formatDate} from "../format.js";

/**
 * Do the calendars say what they mean.
 *
 * "Why does this train not run on Tuesday" almost always ends up here, so the checks are about the
 * ways a calendar can be quietly empty or quietly enormous rather than about it being malformed.
 */

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

/** A date this far out is not a timetable, it is a placeholder somebody left in. */
const FAR_FUTURE = 20500101;

export const CALENDAR_WINDOWS_MAKE_SENSE: Check = {
  id: "calendar-windows-make-sense",
  title: "Every calendar's window runs forwards",
  question: "Does any calendar end before it starts, or run absurdly far into the future?",
  files: ["calendar.txt"],
  needsCalls: false,
  run({feed}, report) {
    const calendar = feed.files.get("calendar.txt")!;

    for (let row = 0; row < calendar.rows; row++) {
      const serviceId = calendar.value("service_id", row);
      const from = Number(calendar.value("start_date", row));
      const to = Number(calendar.value("end_date", row));

      if (serviceId === undefined || !Number.isFinite(from) || !Number.isFinite(to)) {
        continue;
      }

      if (to < from) {
        report({
          severity: "error",
          message: `Service ${serviceId} ends on ${formatDate(to)}, before it starts on `
            + `${formatDate(from)}. It runs on nothing.`,
          ref: {kind: "service", id: serviceId}
        });
      }
      else if (to >= FAR_FUTURE) {
        report({
          severity: "note",
          message: `Service ${serviceId} runs until ${formatDate(to)}, which is not a timetable `
            + "anybody has planned.",
          ref: {kind: "service", id: serviceId}
        });
      }
    }
  }
};

export const CALENDARS_RUN_ON_SOMETHING: Check = {
  id: "calendars-run-on-something",
  title: "Every calendar runs on some day",
  question: "Does any calendar name no weekday and add no date, so nothing on it ever runs?",
  files: ["calendar.txt"],
  needsCalls: false,
  run({feed}, report) {
    const calendar = feed.files.get("calendar.txt")!;
    const dates = feed.files.get("calendar_dates.txt");

    const added = new Set<string>();

    for (let row = 0; dates !== undefined && row < dates.rows; row++) {
      if (Number(dates.value("exception_type", row)) === ADDED) {
        const serviceId = dates.value("service_id", row);

        if (serviceId !== undefined) {
          added.add(serviceId);
        }
      }
    }

    for (let row = 0; row < calendar.rows; row++) {
      const serviceId = calendar.value("service_id", row);

      if (serviceId === undefined || added.has(serviceId)) {
        continue;
      }

      if (DAYS.every(day => calendar.value(day, row) !== "1")) {
        report({
          severity: "error",
          message: `Service ${serviceId} names no day of the week and adds no date, `
            + "so nothing on it ever runs.",
          ref: {kind: "service", id: serviceId}
        });
      }
    }
  }
};

export const EXCEPTIONS_ARE_REMOVALS: Check = {
  id: "exceptions-are-removals",
  title: "Calendar exceptions only remove dates",
  question: "Does calendar_dates.txt add a date, which a feed built this way never does?",
  files: ["calendar_dates.txt"],
  needsCalls: false,
  run({feed}, report) {
    const dates = feed.files.get("calendar_dates.txt")!;

    let added = 0;
    let first: number | undefined;

    for (let row = 0; row < dates.rows; row++) {
      if (Number(dates.value("exception_type", row)) === ADDED) {
        added++;
        first ??= row;
      }
    }

    if (added > 0) {
      // A GB feed writes removals only: an overlay becomes exclusions on the permanent trip plus a
      // separate trip. Additions are not wrong, but in this feed they would mean something changed.
      report({
        severity: "note",
        message: `${added.toLocaleString("en-GB")} rows of calendar_dates.txt add a date rather `
          + "than removing one.",
        ...(first === undefined
          ? {}
          : {ref: {kind: "row" as const, file: "calendar_dates.txt", row: first}})
      });
    }
  }
};

export const EXCEPTIONS_ARE_IN_THE_WINDOW: Check = {
  id: "exceptions-are-in-the-window",
  title: "Calendar exceptions fall inside the feed's window",
  question: "Does calendar_dates.txt name a date outside the period feed_info.txt covers?",
  files: ["calendar_dates.txt", "feed_info.txt"],
  needsCalls: false,
  run({feed}, report) {
    const info = feed.files.get("feed_info.txt")!;
    const from = Number(info.value("feed_start_date", 0));
    const to = Number(info.value("feed_end_date", 0));

    if (!Number.isFinite(from) || !Number.isFinite(to) || from === 0 || to === 0) {
      return;
    }

    const dates = feed.files.get("calendar_dates.txt")!;

    let outside = 0;
    let first: number | undefined;

    for (let row = 0; row < dates.rows; row++) {
      const date = Number(dates.value("date", row));

      if (Number.isFinite(date) && (date < from || date > to)) {
        outside++;
        first ??= row;
      }
    }

    if (outside > 0) {
      report({
        severity: "note",
        message: `${outside.toLocaleString("en-GB")} calendar_dates.txt rows name a date outside `
          + `${formatDate(from)} to ${formatDate(to)}, the window the feed says it covers.`,
        ...(first === undefined
          ? {}
          : {ref: {kind: "row" as const, file: "calendar_dates.txt", row: first}})
      });
    }
  }
};

export const CALENDAR_CHECKS = [
  CALENDAR_WINDOWS_MAKE_SENSE,
  CALENDARS_RUN_ON_SOMETHING,
  EXCEPTIONS_ARE_REMOVALS,
  EXCEPTIONS_ARE_IN_THE_WINDOW
];
