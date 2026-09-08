import {CSVParser, TimeParser} from "@gb-transit/gtfs-loader";
import type {EntrySink, Row} from "@gb-transit/gtfs-loader";
import {Dictionary} from "./Dictionary.js";

/** Where in `flags` each field sits. */
const PICKUP = 0;
const DROP_OFF = 2;
const TIMEPOINT = 4;
const TIMEPOINT_PRESENT = 5;

/** A time the file did not give, or gave in a form nothing can read. */
export const NO_TIME = -1;

/**
 * stop_times.txt, which is the whole reason this is not a ColumnStore.
 *
 * The GB feed has 2.9 million calls. Held as row objects they cost 893 MB; held as one interned
 * Int32Array per column they cost 116 MB; held as the six arrays below they cost 55 MB and are
 * scanned without a dictionary lookup per field. The difference between the last two is what makes
 * running every integrity check over the whole feed a thing a browser can do.
 *
 * Two columns are deliberately not held. stop_headsign is empty on all but a few thousand rows and
 * is the only field in a GB feed that contains a comma; shape_dist_traveled is empty on all of them.
 * Both are fetched by rescanning the zip, which the worker still has, when something asks for them.
 */
export class CallStore {

  public readonly trips = new Dictionary();
  public readonly stops = new Dictionary();

  public tripIx: Int32Array;
  public stopIx: Int32Array;
  public arrival: Int32Array;
  public departure: Int32Array;
  public sequence: Uint16Array;
  public flags: Uint8Array;

  public rows = 0;

  /**
   * Times the file gave in a form nothing could read, counted rather than thrown on.
   *
   * A feed with one bad time is a feed with one bad time; refusing to open it would leave the reader
   * with no way to find out which row it was. The Times check reports these.
   */
  public unreadableTimes = 0;

  /** Whether the file declared each column, so a view can say "absent" rather than "0". */
  public readonly declared: {pickup: boolean, dropOff: boolean, timepoint: boolean};

  private capacity: number;
  private readonly times = new TimeParser();

  constructor(header: readonly string[], capacity = 1024) {
    this.capacity = Math.max(capacity, 1);
    this.declared = {
      pickup: header.includes("pickup_type"),
      dropOff: header.includes("drop_off_type"),
      timepoint: header.includes("timepoint")
    };

    this.tripIx = new Int32Array(this.capacity);
    this.stopIx = new Int32Array(this.capacity);
    this.arrival = new Int32Array(this.capacity);
    this.departure = new Int32Array(this.capacity);
    this.sequence = new Uint16Array(this.capacity);
    this.flags = new Uint8Array(this.capacity);
  }

  /**
   * Take a row.
   *
   * CSVParser hands the same row object back every time, so everything is read out of it here and
   * now. Nothing in this class keeps a reference to it.
   */
  public push(row: Row): void {
    if (this.rows === this.capacity) {
      this.grow();
    }

    const at = this.rows;

    this.tripIx[at] = this.trips.intern(row.trip_id);
    this.stopIx[at] = this.stops.intern(row.stop_id);
    this.arrival[at] = this.time(row.arrival_time);
    this.departure[at] = this.time(row.departure_time);

    // A sequence beyond 65,535 is not a train, but a foreign feed may hold one, and clamping is
    // better than wrapping to a plausible small number nobody would question.
    const sequence = Number(row.stop_sequence);

    this.sequence[at] = Number.isFinite(sequence) ? Math.min(Math.max(sequence, 0), 0xffff) : 0;

    // An empty pickup_type means the call can be boarded, which is what 0 means, so an absent value
    // reads as 0 here. `declared` is what a view uses to say the column was not there at all.
    this.flags[at] = (this.digit(row.pickup_type) << PICKUP)
      | (this.digit(row.drop_off_type) << DROP_OFF)
      | (row.timepoint === undefined
        ? 0
        : ((row.timepoint === "1" ? 1 : 0) << TIMEPOINT) | (1 << TIMEPOINT_PRESENT));

    this.rows++;
  }

  public pickupType(row: number): number {
    return (this.flags[row] >> PICKUP) & 0b11;
  }

  public dropOffType(row: number): number {
    return (this.flags[row] >> DROP_OFF) & 0b11;
  }

  /** Whether the row said this call is a timepoint, or undefined where it did not say. */
  public timepoint(row: number): boolean | undefined {
    return (this.flags[row] >> TIMEPOINT_PRESENT) & 1
      ? Boolean((this.flags[row] >> TIMEPOINT) & 1)
      : undefined;
  }

  public tripId(row: number): string | undefined {
    return this.trips.valueOf(this.tripIx[row]);
  }

  public stopId(row: number): string | undefined {
    return this.stops.valueOf(this.stopIx[row]);
  }

  /**
   * Trim the arrays to what was actually read, so nothing downstream has to remember to stop at
   * `rows`. Called once, when the file ends.
   */
  public seal(): void {
    this.tripIx = this.tripIx.subarray(0, this.rows);
    this.stopIx = this.stopIx.subarray(0, this.rows);
    this.arrival = this.arrival.subarray(0, this.rows);
    this.departure = this.departure.subarray(0, this.rows);
    this.sequence = this.sequence.subarray(0, this.rows);
    this.flags = this.flags.subarray(0, this.rows);
    this.capacity = this.rows;
  }

  /**
   * A time as seconds from the start of the service day, so that 24:35 sorts after 23:50 rather
   * than before it - which is the whole reason a GTFS time is not a clock time.
   */
  private time(value: string | undefined): number {
    if (value === undefined || value === "") {
      return NO_TIME;
    }

    try {
      return this.times.getTime(value);
    }
    catch {
      this.unreadableTimes++;

      return NO_TIME;
    }
  }

  private digit(value: string | undefined): number {
    const digit = value === undefined ? 0 : Number(value);

    return Number.isFinite(digit) && digit >= 0 && digit <= 3 ? digit : 0;
  }

  private grow(): void {
    this.capacity = Math.ceil(this.capacity * 1.5);
    this.tripIx = grow32(this.tripIx, this.capacity);
    this.stopIx = grow32(this.stopIx, this.capacity);
    this.arrival = grow32(this.arrival, this.capacity);
    this.departure = grow32(this.departure, this.capacity);

    const sequence = new Uint16Array(this.capacity);
    const flags = new Uint8Array(this.capacity);

    sequence.set(this.sequence);
    flags.set(this.flags);

    this.sequence = sequence;
    this.flags = flags;
  }

}

function grow32(array: Int32Array, capacity: number): Int32Array {
  const grown = new Int32Array(capacity);

  grown.set(array);

  return grown;
}

/**
 * Where each trip's calls are.
 *
 * In every feed this repository writes, a trip's calls are one contiguous run in file order, so the
 * index is a pair of offsets rather than a list of rows. A feed that interleaves its trips is legal
 * GTFS and gets the general answer instead: the same compressed-row inversion the stop index uses.
 * Which one happened is on `contiguous`, because it is worth telling a reader that their feed is
 * unusual.
 */
export class CallIndex {

  /** For trip dictionary index i, its calls are `rows` from `starts[i]` to `starts[i + 1]`. */
  public readonly starts: Int32Array;
  public readonly rows: Int32Array;
  public readonly contiguous: boolean;

  constructor(keys: Int32Array, size: number, rows: number) {
    const counts = new Int32Array(size + 1);

    for (let row = 0; row < rows; row++) {
      counts[keys[row] + 1]++;
    }

    for (let key = 0; key < size; key++) {
      counts[key + 1] += counts[key];
    }

    this.starts = counts;

    // Filling the buckets in row order leaves each one in file order, which for a trip is calling
    // order and must not be lost.
    const cursor = counts.slice(0, size);
    const index = new Int32Array(rows);

    let contiguous = true;
    let previous = -1;
    const seen = new Uint8Array(size);

    for (let row = 0; row < rows; row++) {
      const key = keys[row];

      index[cursor[key]++] = row;

      if (key !== previous) {
        if (seen[key]) {
          contiguous = false;
        }

        seen[key] = 1;
        previous = key;
      }
    }

    this.rows = index;
    this.contiguous = contiguous;
  }

  /** The rows belonging to a key, in file order. */
  public of(key: number): Int32Array {
    return key < 0 ? new Int32Array(0) : this.rows.subarray(this.starts[key], this.starts[key + 1]);
  }

  public count(key: number): number {
    return key < 0 ? 0 : this.starts[key + 1] - this.starts[key];
  }

}

/**
 * A sink that reads stop_times.txt into a CallStore.
 *
 * Pre-sized from the uncompressed size the zip declares, at 60 bytes a row against the 65 the GB
 * feed actually averages, so it over-allocates by about a tenth rather than copying the whole thing
 * on the way up. A zip written as a stream declares no size and starts from the default instead.
 */
export function callStoreSink(
  onDone: (store: CallStore) => void,
  originalSize?: number
): EntrySink {
  const capacity = originalSize === undefined ? undefined : Math.ceil(originalSize / 60);

  let parser: CSVParser | undefined;
  let store: CallStore | undefined;
  let pending = "";

  return (text, final) => {
    if (parser === undefined) {
      pending += text;

      const newline = pending.indexOf("\n");

      if (newline === -1 && !final) {
        return;
      }

      const line = newline === -1 ? pending : pending.slice(0, newline);
      const header = splitLine(line);

      store = new CallStore(header, capacity);
      parser = new CSVParser(
        ["trip_id", "stop_id", "arrival_time", "departure_time", "stop_sequence",
          "pickup_type", "drop_off_type", "timepoint"],
        row => (store as CallStore).push(row)
      );
      text = pending;
      pending = "";
    }

    parser.write(text);

    if (final) {
      parser.end();
      (store as CallStore).seal();
      onDone(store as CallStore);
    }
  };
}

function splitLine(line: string): string[] {
  const text = line.endsWith("\r") ? line.slice(0, -1) : line;
  const columns = text.split(",");

  if (columns.length > 0 && columns[0].charCodeAt(0) === 0xfeff) {
    columns[0] = columns[0].slice(1);
  }

  return columns;
}
