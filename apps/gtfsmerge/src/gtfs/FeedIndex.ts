import {
  AgencyRow, CalendarDateRow, CalendarRow, FixedLinkRow, RouteRow, StopID, StopRow, StopTimeRow,
  TransferRow, TransferType, TripRow
} from "@gb-transit/gtfs-schema";
import {readFeed} from "@gb-transit/gtfs-loader";
import * as fs from "fs";

/**
 * One input feed, in memory, in the shape the mergers consume.
 */
export interface GTFSZip {
  trips: TripRow[];
  transfers: TransferRow[];
  calendars: CalendarRow[];
  calendarDates: Record<string, CalendarDateRow[]>;
  stopTimes: StopTimeRow[];
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
    trips: [], transfers: [], calendars: [], calendarDates: {}, stopTimes: [], routes: [],
    agencies: [], stops: [], parentStops: {}
  };

  constructor(
    private readonly stopPrefix: string = "",
    private readonly filterBefore?: string
  ) {}

  public trip(row: TripRow): void {
    this.result.trips.push(row);
  }

  /**
   * A call with only one of its times is not a call anything can plan through.
   */
  public stopTime(row: StopTimeRow): void {
    if (row.departure_time && row.arrival_time) {
      row.stop_id = this.stopPrefix + row.stop_id;
      this.result.stopTimes.push(row);
    }
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
 * Read one input feed.
 *
 * The rows are copied out because the reader hands back the same object every
 * time - it is reading a file that may be three million rows and does not
 * allocate one per row.
 */
export async function readMergeInput(
  file: string,
  stopPrefix = "",
  filterBefore?: string
): Promise<GTFSZip> {
  const index = new FeedIndex(stopPrefix, filterBefore);

  await readFeed(fs.createReadStream(file), {
    "trips.txt": row => index.trip({...row}),
    "stop_times.txt": row => index.stopTime({...row}),
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
