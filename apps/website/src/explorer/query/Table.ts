import type {Row} from "@gb-transit/gtfs-loader";
import {NO_TIME} from "../model/CallStore.js";
import type {CallStore} from "../model/CallStore.js";
import type {ColumnStore} from "../model/ColumnStore.js";
import type {Dictionary} from "../model/Dictionary.js";
import type {FeedIndex} from "../model/FeedIndex.js";
import {formatTime} from "../format.js";

/**
 * A file, as the table view reads it.
 *
 * Two very different things present this. Most files are a ColumnStore, which is columns of
 * dictionary indexes and can answer everything. stop_times.txt is a CallStore, which is typed arrays
 * and no dictionary for most of its columns - so the interface offers the fast path where there is
 * one and a plain value read where there is not, and Filter takes whichever it is given.
 */
export interface Table {
  readonly header: readonly string[];
  readonly rows: number;
  value(column: string, row: number): string | undefined;
  row(index: number): Row;
  /** The interned indexes of a column, where it has them, so a filter can scan integers. */
  indexes?(column: string): Int32Array | undefined;
  dictionary?(column: string): Dictionary | undefined;
  /** Columns the store does not hold, which a view should offer to fetch rather than show empty. */
  readonly notHeld?: readonly string[];
}

export function tableOf(feed: FeedIndex, file: string): Table | undefined {
  if (file === "stop_times.txt") {
    return feed.calls === undefined ? undefined : callsTable(feed.calls);
  }

  return feed.files.get(file);
}

/**
 * stop_times.txt as a table.
 *
 * The columns are presented in the order the file writes them, including the two that are not held,
 * so the view shows the file's real shape and says which parts of it are elsewhere rather than
 * silently offering a narrower file than the one on disk.
 */
export function callsTable(calls: CallStore): Table {
  const held = [
    "trip_id", "arrival_time", "departure_time", "stop_id", "stop_sequence",
    ...(calls.declared.pickup ? ["pickup_type"] : []),
    ...(calls.declared.dropOff ? ["drop_off_type"] : []),
    ...(calls.declared.timepoint ? ["timepoint"] : [])
  ];

  const value = (column: string, row: number): string | undefined => {
    switch (column) {
      case "trip_id": return calls.tripId(row);
      case "stop_id": return calls.stopId(row);
      case "arrival_time": return time(calls.arrival[row]);
      case "departure_time": return time(calls.departure[row]);
      case "stop_sequence": return String(calls.sequence[row]);
      case "pickup_type": return calls.declared.pickup ? String(calls.pickupType(row)) : undefined;
      case "drop_off_type": return calls.declared.dropOff ? String(calls.dropOffType(row)) : undefined;
      case "timepoint": {
        const timepoint = calls.timepoint(row);

        return timepoint === undefined ? undefined : timepoint ? "1" : "0";
      }
      default: return undefined;
    }
  };

  return {
    header: held,
    rows: calls.rows,
    notHeld: ["stop_headsign", "shape_dist_traveled"],
    value,
    row: index => Object.fromEntries(held.map(column => [column, value(column, index)])),
    indexes: column => column === "trip_id"
      ? calls.tripIx
      : column === "stop_id" ? calls.stopIx : undefined,
    dictionary: column => column === "trip_id"
      ? calls.trips
      : column === "stop_id" ? calls.stops : undefined
  };
}

function time(seconds: number): string | undefined {
  return seconds === NO_TIME ? undefined : formatTime(seconds);
}
