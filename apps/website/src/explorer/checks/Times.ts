import type {Check} from "./Check.js";
import {NO_TIME} from "../model/CallStore.js";
import {formatTime} from "../format.js";

/**
 * Does time run forwards.
 *
 * The published feed has one call where it does not, and it is in the validator baseline because the
 * source says so and the feed reports its source rather than correcting it. That is exactly why this
 * check reports rather than refuses: a number that should be zero and is one, with a link to the
 * trip, is more use than a rule that would stop the release.
 */

export const TIME_RUNS_FORWARDS: Check = {
  id: "time-runs-forwards",
  title: "Time runs forwards along a trip",
  question: "Does any train arrive somewhere before it left the place before?",
  files: ["stop_times.txt"],
  needsCalls: true,
  run({feed}, report) {
    const calls = feed.calls!;
    const byTrip = feed.byTrip!;

    for (let trip = 0; trip < calls.trips.size; trip++) {
      const rows = byTrip.of(trip);

      let previous = NO_TIME;

      for (const row of rows) {
        const arrival = calls.arrival[row];
        const departure = calls.departure[row];

        if (arrival !== NO_TIME && previous !== NO_TIME && arrival < previous) {
          report({
            severity: "error",
            message: `Trip ${calls.tripId(row)} arrives at ${calls.stopId(row)} at `
              + `${formatTime(arrival)}, before it left the previous stop at ${formatTime(previous)}.`,
            ref: {kind: "trip", id: calls.tripId(row) as string}
          });
        }

        if (arrival !== NO_TIME && departure !== NO_TIME && departure < arrival) {
          report({
            severity: "error",
            message: `Trip ${calls.tripId(row)} leaves ${calls.stopId(row)} at `
              + `${formatTime(departure)}, before it arrived at ${formatTime(arrival)}.`,
            ref: {kind: "trip", id: calls.tripId(row) as string}
          });
        }

        if (departure !== NO_TIME) {
          previous = departure;
        }
        else if (arrival !== NO_TIME) {
          previous = arrival;
        }
      }
    }
  }
};

export const SEQUENCES_ARE_WHOLE: Check = {
  id: "sequences-are-whole",
  title: "Calls are numbered from one, without gaps",
  question: "Does any trip's stop_sequence skip a number or start somewhere other than 1?",
  files: ["stop_times.txt"],
  needsCalls: true,
  run({feed}, report) {
    const calls = feed.calls!;
    const byTrip = feed.byTrip!;

    for (let trip = 0; trip < calls.trips.size; trip++) {
      const rows = byTrip.of(trip);

      if (rows.length === 0) {
        continue;
      }

      for (let at = 0; at < rows.length; at++) {
        if (calls.sequence[rows[at]] !== at + 1) {
          report({
            severity: "note",
            message: `Trip ${calls.tripId(rows[at])} numbers its calls `
              + `${[...rows].map(row => calls.sequence[row]).join(", ")}, `
              + "rather than from 1 without gaps. This is legal, and unusual.",
            ref: {kind: "trip", id: calls.tripId(rows[at]) as string}
          });
          break;
        }
      }
    }
  }
};

export const TRIPS_GO_SOMEWHERE: Check = {
  id: "trips-go-somewhere",
  title: "Every trip calls at least twice",
  question: "Is any trip a journey between fewer than two places?",
  files: ["stop_times.txt", "trips.txt"],
  needsCalls: true,
  run({feed}, report) {
    const calls = feed.calls!;
    const trips = feed.files.get("trips.txt")!;

    for (let row = 0; row < trips.rows; row++) {
      const tripId = trips.value("trip_id", row);

      if (tripId === undefined) {
        continue;
      }

      const count = feed.byTrip!.count(calls.trips.lookup(tripId));

      if (count < 2) {
        report({
          severity: "error",
          message: count === 0
            ? `Trip ${tripId} has no calls at all.`
            : `Trip ${tripId} calls only once, so it is not a journey anyone can make.`,
          ref: {kind: "trip", id: tripId}
        });
      }
    }
  }
};

export const TRIPS_CAN_BE_BOARDED: Check = {
  id: "trips-can-be-boarded",
  title: "Every trip can be boarded somewhere",
  question: "Is any trip one that nobody may board at any of its calls?",
  files: ["stop_times.txt", "trips.txt"],
  needsCalls: true,
  run({feed}, report) {
    const calls = feed.calls!;
    const byTrip = feed.byTrip!;

    for (let trip = 0; trip < calls.trips.size; trip++) {
      const rows = byTrip.of(trip);

      if (rows.length === 0) {
        continue;
      }

      let boardable = false;

      for (const row of rows) {
        if (calls.pickupType(row) !== 1) {
          boardable = true;
          break;
        }
      }

      if (!boardable) {
        report({
          // Expected in a feed carrying the places a train passes through, so a note. In a feed of
          // passenger calls only it is a trip nobody can use.
          severity: "note",
          message: `Trip ${calls.tripId(rows[0])} cannot be boarded at any of its `
            + `${rows.length} calls.`,
          ref: {kind: "trip", id: calls.tripId(rows[0]) as string}
        });
      }
    }
  }
};

export const TIMES_PAST_MIDNIGHT: Check = {
  id: "times-past-midnight",
  title: "Times past midnight",
  question: "How many calls are at 24:00 or later, and how late do they go?",
  files: ["stop_times.txt"],
  needsCalls: true,
  run({feed}, report) {
    const calls = feed.calls!;

    let count = 0;
    let latest = 0;
    let latestTrip: string | undefined;

    for (let row = 0; row < calls.rows; row++) {
      const time = Math.max(calls.arrival[row], calls.departure[row]);

      if (time >= 86400) {
        count++;

        if (time > latest) {
          latest = time;
          latestTrip = calls.tripId(row);
        }
      }
    }

    if (count > 0) {
      // Not a fault. It is how a service day works, and a reader who does not know that will
      // otherwise think the feed is broken - so it is stated rather than left to be discovered.
      report({
        severity: "note",
        message: `${count.toLocaleString("en-GB")} calls are at 24:00 or later, the latest at `
          + `${formatTime(latest)}. These belong to the previous day's service.`,
        ...(latestTrip === undefined ? {} : {ref: {kind: "trip" as const, id: latestTrip}})
      });
    }

    if (calls.unreadableTimes > 0) {
      report({
        severity: "error",
        message: `${calls.unreadableTimes} times could not be read at all and were left empty.`
      });
    }
  }
};

export const TIME_CHECKS = [
  TIME_RUNS_FORWARDS,
  SEQUENCES_ARE_WHOLE,
  TRIPS_GO_SOMEWHERE,
  TRIPS_CAN_BE_BOARDED,
  TIMES_PAST_MIDNIGHT
];
