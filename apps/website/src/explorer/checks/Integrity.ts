import type {Check} from "./Check.js";
import {CONTINUATION} from "../model/Links.js";

/**
 * Does everything the feed names actually exist.
 *
 * The cheapest class of data problem to find and the most expensive to be handed: a trip whose stop
 * is not in stops.txt loads into a planner and then fails at the moment somebody tries to use it.
 */

const ids = (store: {rows: number, value(column: string, row: number): string | undefined},
  column: string): Set<string> => {
  const found = new Set<string>();

  for (let row = 0; row < store.rows; row++) {
    const value = store.value(column, row);

    if (value !== undefined) {
      found.add(value);
    }
  }

  return found;
};

export const CALLS_NAME_A_TRIP: Check = {
  id: "calls-name-a-trip",
  title: "Every call belongs to a trip",
  question: "Does any row of stop_times.txt name a trip that is not in trips.txt?",
  files: ["stop_times.txt", "trips.txt"],
  needsCalls: true,
  run({feed}, report) {
    const known = ids(feed.files.get("trips.txt")!, "trip_id");
    const calls = feed.calls!;
    const reported = new Set<string>();

    for (let row = 0; row < calls.rows; row++) {
      const tripId = calls.tripId(row);

      if (tripId !== undefined && !known.has(tripId) && !reported.has(tripId)) {
        reported.add(tripId);
        report({
          severity: "error",
          message: `stop_times.txt calls on trip ${tripId}, which trips.txt does not have.`,
          ref: {kind: "row", file: "stop_times.txt", row}
        });
      }
    }
  }
};

export const CALLS_NAME_A_STOP: Check = {
  id: "calls-name-a-stop",
  title: "Every call is at a stop",
  question: "Does any row of stop_times.txt name a stop that is not in stops.txt?",
  files: ["stop_times.txt", "stops.txt"],
  needsCalls: true,
  run({feed}, report) {
    const known = ids(feed.files.get("stops.txt")!, "stop_id");
    const calls = feed.calls!;
    const reported = new Set<string>();

    for (let row = 0; row < calls.rows; row++) {
      const stopId = calls.stopId(row);

      if (stopId !== undefined && !known.has(stopId) && !reported.has(stopId)) {
        reported.add(stopId);
        report({
          severity: "error",
          message: `stop_times.txt calls at ${stopId}, which stops.txt does not have.`,
          ref: {kind: "row", file: "stop_times.txt", row}
        });
      }
    }
  }
};

export const TRIPS_HAVE_A_CALENDAR: Check = {
  id: "trips-have-a-calendar",
  title: "Every trip has a calendar",
  question: "Is any trip's service_id absent from both calendar.txt and calendar_dates.txt?",
  files: ["trips.txt"],
  needsCalls: false,
  run({feed, calendars}, report) {
    const trips = feed.files.get("trips.txt")!;

    for (let row = 0; row < trips.rows; row++) {
      const serviceId = trips.value("service_id", row);

      if (serviceId !== undefined && !calendars.has(serviceId)) {
        report({
          severity: "error",
          message: `Trip ${trips.value("trip_id", row)} runs on service ${serviceId}, `
            + "which no calendar describes. It will never run.",
          ref: {kind: "trip", id: trips.value("trip_id", row) as string}
        });
      }
    }
  }
};

export const CALENDARS_HAVE_TRIPS: Check = {
  id: "calendars-have-trips",
  title: "Every calendar is used",
  question: "Is any service in calendar.txt named by no trip?",
  files: ["calendar.txt", "trips.txt"],
  needsCalls: false,
  run({feed}, report) {
    const used = ids(feed.files.get("trips.txt")!, "service_id");
    const calendar = feed.files.get("calendar.txt")!;

    for (let row = 0; row < calendar.rows; row++) {
      const serviceId = calendar.value("service_id", row);

      if (serviceId !== undefined && !used.has(serviceId)) {
        report({
          // Harmless in itself - it is weight rather than a fault - so a note, not an error.
          severity: "note",
          message: `Service ${serviceId} is described in calendar.txt and used by no trip.`,
          ref: {kind: "service", id: serviceId}
        });
      }
    }
  }
};

export const IDS_ARE_UNIQUE: Check = {
  id: "ids-are-unique",
  title: "Identifiers are unique",
  question: "Does any file give the same identifier to two rows?",
  files: [],
  needsCalls: false,
  run({feed}, report) {
    const keys: Record<string, string> = {
      "stops.txt": "stop_id",
      "trips.txt": "trip_id",
      "routes.txt": "route_id",
      "agency.txt": "agency_id",
      "calendar.txt": "service_id"
    };

    for (const [file, column] of Object.entries(keys)) {
      const store = feed.files.get(file);

      if (store === undefined || !store.header.includes(column)) {
        continue;
      }

      const seen = new Map<string, number>();

      for (let row = 0; row < store.rows; row++) {
        const id = store.value(column, row);

        if (id === undefined) {
          continue;
        }

        const first = seen.get(id);

        if (first === undefined) {
          seen.set(id, row);
        }
        else {
          report({
            severity: "error",
            message: `${file} has ${column} ${id} twice, on rows ${first + 2} and ${row + 2}.`,
            ref: {kind: "row", file, row}
          });
        }
      }
    }
  }
};

export const BOARDING_POINTS_HAVE_A_STATION: Check = {
  id: "boarding-points-have-a-station",
  title: "Every boarding point is under a station",
  question: "Does any stop name a parent that is missing, or that is not a station?",
  files: ["stops.txt"],
  needsCalls: false,
  run({feed}, report) {
    const stops = feed.files.get("stops.txt")!;
    const types = new Map<string, string | undefined>();

    for (let row = 0; row < stops.rows; row++) {
      const id = stops.value("stop_id", row);

      if (id !== undefined) {
        types.set(id, stops.value("location_type", row));
      }
    }

    for (let row = 0; row < stops.rows; row++) {
      const parent = stops.value("parent_station", row);
      const id = stops.value("stop_id", row);

      if (parent === undefined || parent === "" || id === undefined) {
        continue;
      }

      if (!types.has(parent)) {
        report({
          severity: "error",
          message: `${id} says its station is ${parent}, which stops.txt does not have.`,
          ref: {kind: "stop", id}
        });
      }
      else if (types.get(parent) !== "1") {
        report({
          severity: "error",
          message: `${id} says its station is ${parent}, which is not a station `
            + `(location_type ${types.get(parent) ?? "empty"}).`,
          ref: {kind: "stop", id}
        });
      }

      if (types.get(id) === "1") {
        report({
          severity: "error",
          message: `${id} is a station and also names ${parent} as its station.`,
          ref: {kind: "stop", id}
        });
      }
    }
  }
};

export const TRANSFERS_NAME_REAL_THINGS: Check = {
  id: "transfers-name-real-things",
  title: "Every transfer names things that exist",
  question: "Does any transfers.txt row name a stop or a trip the feed does not have?",
  files: ["transfers.txt", "stops.txt"],
  needsCalls: false,
  run({feed}, report) {
    const transfers = feed.files.get("transfers.txt")!;
    const stops = ids(feed.files.get("stops.txt")!, "stop_id");
    const trips = feed.files.get("trips.txt");
    const known = trips === undefined ? undefined : ids(trips, "trip_id");

    for (let row = 0; row < transfers.rows; row++) {
      for (const column of ["from_stop_id", "to_stop_id"]) {
        const id = transfers.value(column, row);

        if (id !== undefined && id !== "" && !stops.has(id)) {
          report({
            severity: "error",
            message: `transfers.txt row ${row + 2} names ${column} ${id}, `
              + "which stops.txt does not have.",
            ref: {kind: "row", file: "transfers.txt", row}
          });
        }
      }

      const type = Number(transfers.value("transfer_type", row));

      for (const column of ["from_trip_id", "to_trip_id"]) {
        const id = transfers.value(column, row);

        if (id !== undefined && id !== "" && known !== undefined && !known.has(id)) {
          report({
            severity: "error",
            message: `transfers.txt row ${row + 2} names ${column} ${id}, `
              + "which trips.txt does not have.",
            ref: {kind: "row", file: "transfers.txt", row}
          });
        }
      }

      // A type 4 is the feed saying one vehicle carries on as another. Without both trips it says
      // nothing at all, and a planner reading it will simply drop it.
      if (type === CONTINUATION) {
        const from = transfers.value("from_trip_id", row);
        const to = transfers.value("to_trip_id", row);

        if (from === undefined || from === "" || to === undefined || to === "") {
          report({
            severity: "error",
            message: `transfers.txt row ${row + 2} is a continuation with no trips on it, `
              + "so it names no coupling.",
            ref: {kind: "row", file: "transfers.txt", row}
          });
        }
      }
    }
  }
};

export const INTEGRITY_CHECKS = [
  CALLS_NAME_A_TRIP,
  CALLS_NAME_A_STOP,
  TRIPS_HAVE_A_CALENDAR,
  CALENDARS_HAVE_TRIPS,
  IDS_ARE_UNIQUE,
  BOARDING_POINTS_HAVE_A_STATION,
  TRANSFERS_NAME_REAL_THINGS
];
