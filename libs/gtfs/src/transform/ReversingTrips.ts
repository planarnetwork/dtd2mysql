import {CRS, Duration, StopTime, TIPLOC, Transfer, parseDuration} from "@gb-transit/gtfs-schema";
import {Schedule} from "../model/Schedule";
import {OverlapType, ScheduleCalendar} from "../model/ScheduleCalendar";
import {ReversalRule, reversalRules} from "../data/reversal";
import {inSeatTransfer, TripLink} from "./LinkedTrips";
import {platformOf} from "./Platforms";

/**
 * The trains that end a schedule and start another one without emptying, as in-seat transfers.
 *
 * A CIF association says a coupling outright and `linkedTrips` writes those. This writes the ones
 * the CIF does not say: a service that terminates and turns straight back out the other arm, which
 * arrives as one schedule and leaves as another with nothing joining them. `data/reversal.ts` names
 * the places it happens and why the list is a whitelist rather than a rule anyone can generalise.
 *
 * The evidence a pair leaves in the timetable is what is checked here: the same operator, the shape
 * of the two journeys, one platform, a turnaround short enough to be one, and days in common.
 * Nothing narrows either schedule to those days - unlike an association, which `applyAssociations`
 * cuts - so the calendars are checked to avoid writing a transfer that never applies, and the days
 * it does apply on are the days both trips run.
 *
 * The two times are subtracted as they are told. A train leaving Sutton at one minute past midnight
 * has already been moved onto the previous service day by `shiftLateNightServices`, so it leaves at
 * `24:01` on the day the train it turns back from arrived at `23:58`, and a turnback across midnight
 * is three minutes like any other. A pair the pipeline left on different days is one this does not
 * couple, which is the right way round: a day's allowance here would couple trains a day apart.
 */
export function reversingTrips(
  schedules: readonly Schedule[],
  coupled: readonly TripLink[],
  tiplocs: ReadonlyMap<CRS, TIPLOC>,
  rules: readonly ReversalRule[] = reversalRules
): Transfer[] {
  if (rules.length === 0) {
    return [];
  }

  const buckets: Bucket[] = rules.map(rule => ({rule, arriving: [], departing: []}));
  const termini = new Set(rules.map(rule => rule.at));

  // A schedule left with one stop is not written as a trip, so a transfer naming it would dangle
  for (const schedule of schedules) {
    if (schedule.stopTimes.length < 2) {
      continue;
    }

    // The ends of the journey rather than the first call at the terminus a schedule can name: a
    // train round the loop calls at Sutton twice, and only the one it finishes on is a turnback
    const first = schedule.stopTimes[0];
    const last = schedule.stopTimes[schedule.stopTimes.length - 1];
    const arrives = termini.has(last.stop_id);
    const departs = termini.has(first.stop_id);

    if (!arrives && !departs) {
      continue;
    }

    for (const bucket of buckets) {
      const {rule} = bucket;

      if (schedule.operator !== rule.operator) {
        continue;
      }

      if (arrives && last.stop_id === rule.at && callsAt(schedule, rule.arrivesVia)) {
        bucket.arriving.push(turnback(schedule, last, last.arrival_time));
      }

      if (departs && first.stop_id === rule.at && callsAt(schedule, rule.departsVia)) {
        bucket.departing.push(turnback(schedule, first, first.departure_time));
      }
    }
  }

  // A pair the source already couples is left alone whatever stop the association named, and a pair
  // two rules both match is written once
  const written = new Set(coupled.map(link => pair(link.from, link.to)));
  const rows: Transfer[] = [];
  let unnamed = 0;

  for (const {rule, arriving, departing} of buckets) {
    departing.sort((a, b) => a.time - b.time);

    for (const arrival of arriving) {
      const from = rule.minTurnaround + arrival.time;
      const to = rule.maxTurnaround + arrival.time;

      for (let i = lowerBound(departing, from); i < departing.length && departing[i].time <= to; i++) {
        const departure = departing[i];

        if (arrival.tripId === departure.tripId || written.has(pair(arrival.tripId, departure.tripId))) {
          continue;
        }

        // Two calls naming no platform are two calls the source says nothing about, which is not
        // the same as two calls it puts in one place, and a running line is not somewhere a
        // passenger can be sitting either. `platformOf` answers null to both.
        if (arrival.platform === null || departure.platform === null) {
          unnamed++;
          continue;
        }

        if (arrival.platform !== departure.platform) {
          continue;
        }

        if (arrival.calendar.getOverlap(departure.calendar) === OverlapType.None) {
          continue;
        }

        written.add(pair(arrival.tripId, departure.tripId));
        rows.push(inSeatTransfer(arrival.stopTime, departure.stopTime, tiplocs));
      }
    }
  }

  if (rows.length > 0 || unnamed > 0) {
    console.log(
      `Coupled ${rows.length} pair(s) of trips turning back where they arrived` +
      (unnamed > 0 ? `, ${unnamed} left alone for a platform the source does not name on both sides` : "")
    );
  }

  return rows;
}

/** The two ends of one rule's turnback: what arrives to make it, and what could leave on it. */
interface Bucket {
  readonly rule: ReversalRule;
  readonly arriving: Turnback[];
  readonly departing: Turnback[];
}

/**
 * One end of a schedule at a terminus, with everything the pairing asks about read once. Each
 * departure is looked at by every arrival in the ten minutes before it.
 */
interface Turnback {
  readonly stopTime: StopTime;
  readonly tripId: string;
  readonly time: Duration;
  readonly platform: string | null;
  readonly calendar: ScheduleCalendar;
}

function callsAt(schedule: Schedule, location: CRS): boolean {
  return schedule.stopTimes.some(stopTime => stopTime.stop_id === location);
}

function turnback(schedule: Schedule, stopTime: StopTime, time: string): Turnback {
  return {
    stopTime,
    tripId: stopTime.trip_id,
    time: parseDuration(time),
    platform: platformOf(stopTime),
    calendar: schedule.calendar
  };
}

function pair(from: string, to: string): string {
  return `${from}\0${to}`;
}

/**
 * The first departure at or after the given time. The candidates for one arrival are the one or two
 * trains in a ten minute window, so they are found rather than filtered for.
 */
function lowerBound(departing: readonly Turnback[], time: Duration): number {
  let low = 0;
  let high = departing.length;

  while (low < high) {
    const middle = (low + high) >>> 1;

    if (departing[middle].time < time) {
      low = middle + 1;
    }
    else {
      high = middle;
    }
  }

  return low;
}
