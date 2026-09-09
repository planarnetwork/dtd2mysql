import {
  AgencyRow, CalendarDateRow, CalendarRow, FixedLinkRow, RouteRow, StopID, StopRow,
  TransferRow, TransferType, TripRow
} from "@gb-transit/gtfs-schema";
import {readFeed} from "@gb-transit/gtfs-loader";
import * as fs from "fs";
import {StopTimeReader} from "./merger/StopTimesMerger";

/**
 * One input feed, in memory, in the shape the mergers consume.
 */
export interface GTFSZip {
  trips: TripRow[];
  transfers: TransferRow[];
  calendars: CalendarRow[];
  calendarDates: Record<string, CalendarDateRow[]>;
  routes: RouteRow[];
  agencies: AgencyRow[];
  stops: StopRow[];
  parentStops: Record<StopID, StopID>;
}

/**
 * Accumulates a feed as its rows arrive, applying the filters a merge wants
 * applied before anything is merged.
 *
 * This is the loader gtfsmerge used to have, with the dynamic `this[type](row)`
 * dispatch replaced by handlers named at the call site and the rows typed by the
 * shared schema. Every filter is the one it had.
 */
export class FeedIndex {

  private readonly transfers: Record<string, TransferRow> = {};
  private readonly result: GTFSZip = {
    trips: [], transfers: [], calendars: [], calendarDates: {}, routes: [],
    agencies: [], stops: [], parentStops: {}
  };

  constructor(
    private readonly stopPrefix: string = "",
    private readonly filterBefore?: string
  ) {}

  public trip(row: TripRow): void {
    this.result.trips.push(row);
  }

  public route(row: RouteRow): void {
    this.result.routes.push(row);
  }

  /**
   * A stop with a parent is not published; what is remembered is where its
   * parent is, so a call at it becomes a call at the station.
   */
  public stop(row: StopRow): void {
    if (!row.parent_station) {
      row.stop_id = this.stopPrefix + row.stop_id;
      this.result.stops.push(row);
    }
    else {
      this.result.parentStops[row.stop_id] = row.parent_station;
    }
  }

  public agency(row: AgencyRow): void {
    this.result.agencies.push(row);
  }

  /**
   * A calendar that has finished, or that runs on no day at all, is not worth
   * carrying into the merged feed.
   *
   * The filter being absent means keep everything. It used to read
   * `!filterBefore || end_date < filterBefore`, which is true when there is no
   * filter - so --no-date-filter dropped every calendar in every feed, and left
   * only the services that CalendarFactory could synthesise out of orphan
   * calendar_dates rows.
   */
  public calendar(row: CalendarRow): void {
    const finished = this.filterBefore !== undefined
      && (row.end_date ?? "") < this.filterBefore;
    const runs = row.monday || row.tuesday || row.wednesday || row.thursday || row.friday
      || row.saturday || row.sunday;

    if (!finished && runs) {
      this.result.calendars.push(row);
    }
  }

  public calendarDate(row: CalendarDateRow): void {
    if (this.filterBefore === undefined || row.date >= this.filterBefore) {
      const id = String(row.service_id);

      (this.result.calendarDates[id] ||= []).push(row);
    }
  }

  /**
   * links.txt is this repository's own file: a fixed link between two stations
   * with a duration and a window. As a transfer it is a minimum time.
   */
  public link(row: FixedLinkRow): void {
    this.transfer({
      from_stop_id: row.from_stop_id,
      to_stop_id: row.to_stop_id,
      transfer_type: TransferType.MinTime,
      min_transfer_time: row.duration
    });
  }

  /**
   * One transfer per pair, the shortest of them.
   */
  public transfer(row: TransferRow): void {
    row.from_stop_id = this.stopPrefix + row.from_stop_id;
    row.to_stop_id = this.stopPrefix + row.to_stop_id;

    // A coupling is between two named trips, so it is not the same row as an
    // interchange at the same pair of stops and does not replace it.
    const key = row.transfer_type === TransferType.InSeat
      ? `${row.from_stop_id}_${row.to_stop_id}_${row.from_trip_id}_${row.to_trip_id}`
      : `${row.from_stop_id}_${row.to_stop_id}`;
    const seen = this.transfers[key];

    if (!seen || (seen.min_transfer_time ?? Infinity) > (row.min_transfer_time ?? Infinity)) {
      this.transfers[key] = row;
    }
  }

  public results(): GTFSZip {
    return {...this.result, transfers: Object.values(this.transfers)};
  }

}

/**
 * Read one input feed, apart from its stop times.
 *
 * The rows are copied out because the reader hands back the same object every
 * time - it is reading a file that may be three million rows and does not
 * allocate one per row.
 *
 * The stop times are left for `stopTimesOf` and a second pass over the file.
 * Everything here is needed before a single call can be written - a call is
 * indexed against its trip, and a trip against its route and its calendar - and
 * everything here put together is a fortieth of what the calls cost to hold.
 */
export async function readMergeInput(
  file: string,
  stopPrefix = "",
  filterBefore?: string
): Promise<GTFSZip> {
  const index = new FeedIndex(stopPrefix, filterBefore);

  await readFeed(fs.createReadStream(file), {
    "trips.txt": row => index.trip({...row}),
    "routes.txt": row => index.route({...row}),
    "stops.txt": row => index.stop({...row}),
    "agency.txt": row => index.agency({...row}),
    "calendar.txt": row => index.calendar({...row}),
    "calendar_dates.txt": row => index.calendarDate({...row}),
    "transfers.txt": row => index.transfer({...row}),
    "links.txt": row => index.link({...row})
  });

  return index.results();
}

/**
 * The stop times of one feed, in a pass of their own.
 *
 * Nothing is kept: each call is handed straight to whoever asked for it, and the
 * merger writes it and lets it go. A second read of the file is what that costs,
 * and the file is read rather than held.
 *
 * A call with only one of its times is not a call anything can plan through, so
 * it never leaves here.
 */
export function stopTimesOf(file: string, stopPrefix = ""): StopTimeReader {
  return async (onRow, betweenChunks) => {
    await readFeed(pausing(file, betweenChunks), {
      "stop_times.txt": row => {
        if (row.departure_time && row.arrival_time) {
          row.stop_id = stopPrefix + row.stop_id;

          onRow(row);
        }
      }
    });
  };
}

/**
 * The file, a chunk at a time, giving the reader's consumer a turn between one
 * chunk and the next.
 *
 * The rows of a chunk arrive from a synchronous parser, which cannot be made to
 * wait for a writer partway through. Here it can: the reader asks for the next
 * chunk, and does not get one until the calls from the last chunk are written.
 */
async function* pausing(
  file: string,
  betweenChunks: () => Promise<void>
): AsyncIterable<Uint8Array> {
  for await (const chunk of fs.createReadStream(file)) {
    yield chunk;

    await betweenChunks();
  }
}
