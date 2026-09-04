import {IdGenerator, STP} from "../model/OverlayRecord";
import {Schedule, tripId} from "../model/Schedule";
import {RouteType} from "../entity/Route";
import {NO_DAYS, ScheduleCalendar} from "../model/ScheduleCalendar";
import {ScheduleStopTimeRow} from "../source/TimetableSource";
import {PickupDropOffType, StopTime} from "../entity/StopTime";

const pickupActivities = ["T ", "TB", "U "];
const dropOffActivities = ["T ", "TF", "D "];
const requestStopActivity = "R ";
const notAdvertisedActivity = "N ";

/**
 * Where a run of rows for one schedule is accumulated.
 *
 * One per run, not one per builder: the MySQL source loads the passenger
 * schedules and the z-trains concurrently into the same builder, and two
 * interleaved streams sharing a cursor would splice each other's stop times into
 * the wrong trains.
 */
interface Cursor {
  stops: StopTime[];
  prevRow?: ScheduleStopTimeRow;
  departureHour: number;
}

/**
 * This class takes rows in the TimetableSource ordering and builds a list of Schedules.
 *
 * The ordering is the contract: rows for one schedule must be contiguous and in
 * stop sequence, and schedules must arrive stp_indicator DESC so a cancellation
 * or overlay follows the permanent record it replaces. The builder groups on
 * `id` changing, so a source that interleaves two schedules produces two trains
 * with each other's stops.
 */
export class ScheduleBuilder {
  private readonly schedules: Schedule[] = [];
  private maxId: number = 0;
  private droppedStops: number = 0;

  /**
   * `exclude` holds the CRS codes of stations that are not places - see
   * Placeholder. Their stop times are dropped here rather than at the source
   * because the z-train query takes its stop id straight from the ZTR location
   * and never meets physical_station, and every affected trip is a z-train.
   */
  constructor(private readonly exclude: ReadonlySet<string> = new Set()) {}

  /**
   * How many stop times were dropped for calling at a station that is not a
   * place. Reported rather than left silent: it is the only visible effect on
   * services, and a jump in it means the match has started catching something
   * it should not.
   */
  public get dropped(): number {
    return this.droppedStops;
  }

  private getTripId(row: ScheduleStopTimeRow) {
    return tripId(row.train_uid, new ScheduleCalendar(
      Temporal.PlainDate.from(row.runs_from),
      Temporal.PlainDate.from(row.runs_to),
      NO_DAYS
    ));
  }

  /**
   * Take a stream of ScheduleStopTimeRow, turn them into Schedule objects and add the result to the schedules
   */
  public loadSchedules(results: any): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const cursor = newCursor();
      let failed = false;

      results.on("result", (row: ScheduleStopTimeRow) => {
        // an error thrown from here is emitted inside the driver's packet parser, where it is
        // swallowed - the query then emits neither "end" nor "error" and this promise never
        // settles. Catch it so a bad row fails the build rather than hanging it forever.
        if (failed) return;

        try {
          this.processRow(cursor, row);
        }
        catch (err) {
          failed = true;
          reject(err);
        }
      });

      results.on("end", () => {
        if (failed) return;

        this.flush(cursor);
        resolve();
      });
      results.on("error", reject);
    });
  }

  /**
   * Take rows from anything iterable in the same order a stream would deliver
   * them. This is what a source that is not a database query uses.
   */
  public load(rows: Iterable<ScheduleStopTimeRow>): void {
    const cursor = newCursor();

    for (const row of rows) {
      this.processRow(cursor, row);
    }

    this.flush(cursor);
  }

  private processRow(cursor: Cursor, row: ScheduleStopTimeRow): void {
    const startsSchedule = !cursor.prevRow || cursor.prevRow.id !== row.id;

    if (cursor.prevRow && startsSchedule) {
      this.schedules.push(this.createSchedule(cursor.prevRow, cursor.stops));
      cursor.stops = [];
    }

    // The origin's departure hour decides whether a later stop has rolled over
    // midnight, so it is taken from the first row of every schedule - including
    // the first schedule in the run.
    if (startsSchedule) {
      cursor.departureHour = row.public_arrival_time
        ? parseInt(row.public_arrival_time.substr(0, 2), 10)
        : row.public_departure_time ? parseInt(row.public_departure_time.substr(0, 2), 10) : 4;
    }

    // A schedule with no stop times is returned as a single row with every stop_time
    // column null, because getSchedules keeps them with `stop_time.id IS NULL`. There is
    // no stop to build from that row, and the schedule is dropped later on when it turns
    // out to have fewer than two stops.
    if (row.stp_indicator !== STP.Cancellation && row.stop_id !== null && this.exclude.has(row.crs_code)) {
      this.droppedStops++;
    }
    else if (row.stp_indicator !== STP.Cancellation && row.stop_id !== null) {
      const stop = this.createStop(row, cursor.stops.length + 1, cursor.departureHour);

      if (cursor.prevRow && cursor.prevRow.id === row.id && row.crs_code === cursor.prevRow.crs_code) {
        if (stop.pickup_type === PickupDropOffType.Scheduled || stop.drop_off_type === PickupDropOffType.Scheduled) {
          cursor.stops[cursor.stops.length - 1] = Object.assign(stop, { stop_sequence: cursor.stops.length });
        }
      }
      else {
        cursor.stops.push(stop);
      }
    }

    cursor.prevRow = row;
  }

  private flush(cursor: Cursor): void {
    if (cursor.prevRow) {
      this.schedules.push(this.createSchedule(cursor.prevRow, cursor.stops));
      cursor.prevRow = undefined;
      cursor.stops = [];
    }
  }

  private createSchedule(row: ScheduleStopTimeRow, stops: StopTime[]): Schedule {
    this.maxId = Math.max(this.maxId, row.id);

    const mode = routeTypeIndex.hasOwnProperty(row.train_category) ? routeTypeIndex[row.train_category] : RouteType.Rail;

    return new Schedule(
      row.id,
      stops,
      row.train_uid,
      row.retail_train_id,
      new ScheduleCalendar(
        Temporal.PlainDate.from(row.runs_from),
        Temporal.PlainDate.from(row.runs_to),
        {
          0: row.sunday,
          1: row.monday,
          2: row.tuesday,
          3: row.wednesday,
          4: row.thursday,
          5: row.friday,
          6: row.saturday
        }
      ),
      mode,
      row.atoc_code ?? "ZZ",
      row.stp_indicator,
      mode === RouteType.Rail && row.train_class !== "S",
      row.reservations !== null
    );
  }

  private static getPickupDropOffType(activity: string, pickupOrDropOffActivities: string[]): PickupDropOffType {
    if (hasActivity(activity, notAdvertisedActivity)) {
      return PickupDropOffType.None;
    }

    if (hasActivity(activity, requestStopActivity)) {
      return PickupDropOffType.CoordinateWithDriver;
    }

    return pickupOrDropOffActivities.some(a => hasActivity(activity, a))
      ? PickupDropOffType.Scheduled
      : PickupDropOffType.None;
  }

  private createStop(row: ScheduleStopTimeRow, stopId: number, departHour: number): StopTime {
    let arrivalTime, departureTime;

    // if either public time is set, use those
    if (row.public_arrival_time || row.public_departure_time) {
      arrivalTime = this.formatTime(row.public_arrival_time, departHour);
      departureTime = this.formatTime(row.public_departure_time, departHour);
    }
    // if no public time at all (no set down or pick) use the scheduled time
    else {
      arrivalTime = this.formatTime(row.scheduled_arrival_time, departHour);
      departureTime = this.formatTime(row.scheduled_departure_time, departHour);
    }

    const arrival = arrivalTime || departureTime;
    const departure = departureTime || arrivalTime;

    if (arrival === null || departure === null) {
      throw new Error(`Stop ${row.crs_code} on trip ${row.id} has no arrival or departure time`);
    }

    return {
      trip_id: this.getTripId(row),
      arrival_time: arrival,
      departure_time: departure,
      stop_id: row.crs_code,
      stop_sequence: stopId,
      // Not the platform. stop_headsign overrides the trip headsign at a stop -
      // it means "this service terminates here", not "platform 3". The platform
      // belongs on a platform-level stop, which needs the station hierarchy.
      stop_headsign: null,
      pickup_type: ScheduleBuilder.getPickupDropOffType(row.activity, pickupActivities),
      drop_off_type: ScheduleBuilder.getPickupDropOffType(row.activity, dropOffActivities),
      shape_dist_traveled: null,
      timepoint: 1,
      platform: row.platform,
      tiploc: row.tiploc
    };
  }

  private formatTime(time: string | null, originDepartureHour: number) {
    if (time === null) return null;

    const departureHour = parseInt(time.substr(0, 2), 10);

    // if the service started after 4am and after the current stops departure hour we've probably rolled over midnight
    if (originDepartureHour >= 4 && originDepartureHour > departureHour) {
      return (departureHour + 24) + time.substr(2);
    }

    return time;
  }

  public get results(): ScheduleResults {
    return {
      schedules: this.schedules,
      idGenerator: this.getIdGenerator(this.maxId)
    };
  }

  private *getIdGenerator(startId: number): IterableIterator<number> {
    let id = startId + 1;
    while (true) {
      yield id++;
    }
  }
}

export interface ScheduleResults {
  schedules: Schedule[],
  idGenerator: IdGenerator
}

const routeTypeIndex: { [trainCategory: string]: RouteType } = {
  "OO": RouteType.Rail,
  "XX": RouteType.Rail,
  "XZ": RouteType.Rail,
  "BR": RouteType.ReplacementBus,
  "BS": RouteType.Bus,
  "OL": RouteType.Subway,
  "XC": RouteType.Rail,
  "SS": RouteType.Ferry
};

function newCursor(): Cursor {
  return {stops: [], departureHour: 4};
}

function hasActivity(activity: string, code: string): boolean {
  for (let i = 0; i < activity.length; i += 2) {
    if (activity.startsWith(code, i)) {
      return true;
    }
  }

  return false;
}
