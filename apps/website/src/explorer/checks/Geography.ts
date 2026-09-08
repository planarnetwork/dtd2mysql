import type {Check} from "./Check.js";
import {metresBetween} from "../format.js";

/**
 * Is everything where it says it is.
 *
 * The most commonly disputed thing in the feed. The timetable gives coordinates rounded to a hundred
 * metres and NaPTAN supplies real ones over the top, so a station being in the wrong place is
 * usually a question about which source won rather than about the number itself - which is why every
 * finding here links to the stop view, where the ledger is.
 */

/** Great Britain, plus enough margin for the islands and the Channel Tunnel. */
const NORTH = 61.0;
const SOUTH = 49.7;
const WEST = -8.8;
const EAST = 2.1;

/**
 * How far a boarding point may be from its station before it is worth reporting.
 *
 * A hundred metres because that is the precision the timetable's own coordinates have, so anything
 * inside it is not a disagreement. Currently silent on the published feed, which is what a good
 * check looks like: it is here for the state the feed was in before the boarding points were built
 * after enrichment rather than before it.
 */
const APART = 100;

function coordinates(store: {rows: number, value(column: string, row: number): string | undefined}) {
  return function* () {
    for (let row = 0; row < store.rows; row++) {
      const id = store.value("stop_id", row);
      const lat = store.value("stop_lat", row);
      const lon = store.value("stop_lon", row);

      if (id === undefined) {
        continue;
      }

      yield {
        row,
        id,
        name: store.value("stop_name", row),
        lat: lat === undefined || lat === "" ? undefined : Number(lat),
        lon: lon === undefined || lon === "" ? undefined : Number(lon)
      };
    }
  }();
}

export const STOPS_ARE_LOCATED: Check = {
  id: "stops-are-located",
  title: "Every stop has a position",
  question: "Is any stop published at 0,0, or with no coordinate at all?",
  files: ["stops.txt"],
  needsCalls: false,
  run({feed}, report) {
    for (const stop of coordinates(feed.files.get("stops.txt")!)) {
      if (stop.lat === undefined || stop.lon === undefined
        || !Number.isFinite(stop.lat) || !Number.isFinite(stop.lon)) {
        report({
          severity: "error",
          message: `${stop.id} ${stop.name ?? ""} has no coordinate.`.replace(/ +/g, " "),
          ref: {kind: "stop", id: stop.id}
        });
      }
      else if (stop.lat === 0 && stop.lon === 0) {
        // Deliberate for a couple of stops in the published feed: somewhere a validator will flag is
        // better than a plausible centroid that hides the fact nobody knows where they are.
        report({
          severity: "warning",
          message: `${stop.id} ${stop.name ?? ""} is published at 0,0, `.replace(/ +/g, " ")
            + "which is in the Atlantic. Nothing knows where it is.",
          ref: {kind: "stop", id: stop.id}
        });
      }
    }
  }
};

export const STOPS_ARE_IN_GB: Check = {
  id: "stops-are-in-gb",
  title: "Every stop is in Great Britain",
  question: "Is any stop outside the bounding box the network fits in?",
  files: ["stops.txt"],
  needsCalls: false,
  run({feed}, report) {
    for (const stop of coordinates(feed.files.get("stops.txt")!)) {
      if (stop.lat === undefined || stop.lon === undefined
        || !Number.isFinite(stop.lat) || !Number.isFinite(stop.lon)
        || (stop.lat === 0 && stop.lon === 0)) {
        continue; // the located check has these
      }

      if (stop.lat > NORTH || stop.lat < SOUTH || stop.lon < WEST || stop.lon > EAST) {
        report({
          // Some are legitimately outside - the feed reaches the continent - so this reports rather
          // than fails, and the reader decides.
          severity: "warning",
          message: `${stop.id} ${stop.name ?? ""} is at ${stop.lat}, ${stop.lon}, `.replace(/ +/g, " ")
            + "outside Great Britain.",
          ref: {kind: "stop", id: stop.id}
        });
      }
    }
  }
};

export const PLATFORMS_ARE_AT_THEIR_STATION: Check = {
  id: "platforms-are-at-their-station",
  title: "Every boarding point is at its station",
  question: `Is any boarding point more than ${APART} metres from the station it belongs to?`,
  files: ["stops.txt"],
  needsCalls: false,
  run({feed}, report) {
    const stops = feed.files.get("stops.txt")!;
    const parents = new Map<string, {lat: number, lon: number, name?: string}>();

    for (const stop of coordinates(stops)) {
      if (stop.lat !== undefined && stop.lon !== undefined
        && Number.isFinite(stop.lat) && Number.isFinite(stop.lon)) {
        parents.set(stop.id, {lat: stop.lat, lon: stop.lon, name: stop.name});
      }
    }

    for (let row = 0; row < stops.rows; row++) {
      const parentId = stops.value("parent_station", row);
      const id = stops.value("stop_id", row);
      const lat = Number(stops.value("stop_lat", row));
      const lon = Number(stops.value("stop_lon", row));

      if (parentId === undefined || parentId === "" || id === undefined
        || !Number.isFinite(lat) || !Number.isFinite(lon)) {
        continue;
      }

      const parent = parents.get(parentId);

      if (parent === undefined || (parent.lat === 0 && parent.lon === 0) || (lat === 0 && lon === 0)) {
        continue;
      }

      const metres = metresBetween(parent.lat, parent.lon, lat, lon);

      if (metres > APART) {
        report({
          severity: "warning",
          message: `${id} is ${metres.toLocaleString("en-GB")} metres from `
            + `${parentId} ${parent.name ?? ""}, the station it belongs to.`.replace(/ +/g, " "),
          ref: {kind: "stop", id}
        });
      }
    }
  }
};

export const STATIONS_AND_PLATFORMS_AGREE: Check = {
  id: "stations-and-platforms-agree",
  title: "A boarding point is named after its station",
  question: "Does any boarding point's name not begin with its station's name?",
  files: ["stops.txt"],
  needsCalls: false,
  run({feed}, report) {
    const stops = feed.files.get("stops.txt")!;
    const names = new Map<string, string>();

    for (let row = 0; row < stops.rows; row++) {
      const id = stops.value("stop_id", row);
      const name = stops.value("stop_name", row);

      if (id !== undefined && name !== undefined) {
        names.set(id, name);
      }
    }

    for (let row = 0; row < stops.rows; row++) {
      const parentId = stops.value("parent_station", row);
      const id = stops.value("stop_id", row);
      const name = stops.value("stop_name", row);

      if (parentId === undefined || parentId === "" || id === undefined || name === undefined) {
        continue;
      }

      const parent = names.get(parentId);

      if (parent !== undefined && !name.startsWith(parent)) {
        // The same artefact as the distance check, for names: a boarding point built before the
        // station was renamed keeps the old name while the station gets the new one.
        report({
          severity: "note",
          message: `${id} is called "${name}" but its station ${parentId} is called "${parent}".`,
          ref: {kind: "stop", id}
        });
      }
    }
  }
};

export const GEOGRAPHY_CHECKS = [
  STOPS_ARE_LOCATED,
  STOPS_ARE_IN_GB,
  PLATFORMS_ARE_AT_THEIR_STATION,
  STATIONS_AND_PLATFORMS_AGREE
];
