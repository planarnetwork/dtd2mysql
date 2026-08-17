import {IdGenerator, STP} from "../model/OverlayRecord";
import {Schedule, tripId} from "../model/Schedule";
import {RouteType} from "../entity/Route";
import {NO_DAYS, ScheduleCalendar} from "../model/ScheduleCalendar";
import {ScheduleStopTimeRow} from "../source/TimetableSource";
import {StopTime} from "../entity/StopTime";
import {agencies} from "../data/agency";

const pickupActivities = ["T ", "TB", "U "];
const dropOffActivities = ["T ", "TF", "D "];
const coordinatedActivity = ["R "];
const notAdvertised = "N ";

/**
 * This class takes a stream of results and builds a list of Schedules
 */
export class ScheduleBuilder {
  private readonly schedules: Schedule[] = [];
  private maxId: number = 0;

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
      let stops: StopTime[] = [];
      let prevRow: ScheduleStopTimeRow;
      let departureHour = 4;
      let failed = false;

      results.on("result", (row: ScheduleStopTimeRow) => {
        // an error thrown from here is emitted inside the driver's packet parser, where it is
        // swallowed - the query then emits neither "end" nor "error" and this promise never
        // settles. Catch it so a bad row fails the build rather than hanging it forever.
        if (failed) return;

        try {
          if (prevRow && prevRow.id !== row.id) {
            this.schedules.push(this.createSchedule(prevRow, stops));
            stops = [];

            departureHour = row.public_arrival_time
              ? parseInt(row.public_arrival_time.substr(0, 2), 10)
              : row.public_departure_time ? parseInt(row.public_departure_time.substr(0, 2), 10) : 4;
          }

          // A schedule with no stop times is returned as a single row with every stop_time
          // column null, because getSchedules keeps them with `stop_time.id IS NULL`. There is
          // no stop to build from that row, and the schedule is dropped later on when it turns
          // out to have fewer than two stops.
          if (row.stp_indicator !== STP.Cancellation && row.stop_id !== null) {
            const stop = this.createStop(row, stops.length + 1, departureHour);

            if (prevRow && prevRow.id === row.id && row.crs_code === prevRow.crs_code) {
              if (stop.pickup_type === 0 || stop.drop_off_type === 0) {
                stops[stops.length - 1] = Object.assign(stop, { stop_sequence: stops.length });
              }
            }
            else {
              stops.push(stop);
            }
          }

          prevRow = row;
        }
        catch (err) {
          failed = true;
          reject(err);
        }
      });

      results.on("end", () => {
        if (failed) return;

        if (prevRow) {
          this.schedules.push(this.createSchedule(prevRow, stops));
        }

        resolve();
      });
      results.on("error", reject);
    });
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
      agencies.some((a) => a.agency_id === row.atoc_code) ? row.atoc_code : "ZZ",
      row.stp_indicator,
      mode === RouteType.Rail && row.train_class !== "S",
      row.reservations !== null
    );
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

    const activities = row.activity.match(/.{1,2}/g) || [] as string[];
    const pickup = pickupActivities.find(a => activities.includes(a)) && !activities.includes(notAdvertised) ? 0 : 1;
    const coordinatedDropOff = coordinatedActivity.find(a => activities.includes(a)) ? 3 : 0;
    const dropOff = dropOffActivities.find(a => activities.includes(a)) ? 0 : 1;

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
      stop_headsign: row.platform,
      pickup_type: coordinatedDropOff || pickup,
      drop_off_type: coordinatedDropOff || dropOff,
      shape_dist_traveled: null,
      timepoint: 1
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
