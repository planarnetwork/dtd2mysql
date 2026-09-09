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
 * A pair that satisfies all of it is still only written where it is the only answer. `unambiguous`
 * says what that means and why the usual several candidates are not a contradiction.
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
  // two rules both match is taken once
  const taken = new Set(coupled.map(link => pair(link.from, link.to)));
  const couplings: Coupling[] = [];
  let unnamed = 0;

  for (const {rule, arriving, departing} of buckets) {
    departing.sort((a, b) => a.time - b.time);

    for (const arrival of arriving) {
      const from = rule.minTurnaround + arrival.time;
      const to = rule.maxTurnaround + arrival.time;
      let unnamedPlatform = false;

      for (let i = lowerBound(departing, from); i < departing.length && departing[i].time <= to; i++) {
        const departure = departing[i];

        if (arrival.tripId === departure.tripId || taken.has(pair(arrival.tripId, departure.tripId))) {
          continue;
        }

        if (arrival.calendar.getOverlap(departure.calendar) === OverlapType.None) {
          continue;
        }

        // A call the source gave no platform and a call that named a running line are both places
        // it has not said the passenger is standing, and `platformOf` answers null to both. So a
        // pair is coupled only where the source named a platform on each side and named the same
        // one: two nulls are the source saying nothing rather than the source agreeing.
        if (arrival.platform === null || departure.platform === null) {
          unnamedPlatform = true;
          continue;
        }

        if (arrival.platform !== departure.platform) {
          continue;
        }

        taken.add(pair(arrival.tripId, departure.tripId));
        couplings.push({arrival, departure});
      }

      // Counted per train rather than per candidate, and only for a train that would otherwise have
      // been coupled, so the number is the couplings the missing platforms cost
      if (unnamedPlatform) {
        unnamed++;
      }
    }
  }

  const rows = unambiguous(couplings).map(
    ({arrival, departure}) => inSeatTransfer(arrival.stopTime, departure.stopTime, tiplocs)
  );

  if (couplings.length > 0 || unnamed > 0) {
    console.log(
      `Coupled ${rows.length} pair(s) of trips turning back where they arrived` +
      (unnamed > 0 ? `, ${unnamed} left alone for a platform the source does not name on both sides` : "") +
      (rows.length < couplings.length ? `, ${couplings.length - rows.length} for naming no one train` : "")
    );
  }

  return rows;
}

/**
 * The couplings that name one train each way.
 *
 * A train can turn back into more than one, and usually does: an overlay is a schedule of its own,
 * so the Sutton departure a train becomes is one record for most of the year and a dozen short
 * dated ones for the days that were retimed. Those are alternatives rather than a contradiction,
 * because `applyOverlays` has already cut the overlaid days out of the wide record and only one of
 * them runs on any given day.
 *
 * Two candidates that do run on the same day are a contradiction: the timetable does not say which
 * of them the unit becomes, and writing both tells a reader that one train continues as two, which
 * it will believe and build two through journeys from. So a candidate that shares a day with
 * another candidate of the same train is dropped, in both directions, and the ones that are still
 * the only answer on every day they run are kept.
 */
function unambiguous(couplings: readonly Coupling[]): Coupling[] {
  const contradicted = new Set<Coupling>();

  contradict(couplings, coupling => coupling.arrival.tripId, coupling => coupling.departure, contradicted);
  contradict(couplings, coupling => coupling.departure.tripId, coupling => coupling.arrival, contradicted);

  return couplings.filter(coupling => !contradicted.has(coupling));
}

function contradict(
  couplings: readonly Coupling[],
  tripId: (coupling: Coupling) => string,
  partner: (coupling: Coupling) => Turnback,
  contradicted: Set<Coupling>
): void {
  const byTrip = new Map<string, Coupling[]>();

  for (const coupling of couplings) {
    byTrip.set(tripId(coupling), [...byTrip.get(tripId(coupling)) ?? [], coupling]);
  }

  for (const group of byTrip.values()) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        if (partner(group[i]).calendar.getOverlap(partner(group[j]).calendar) !== OverlapType.None) {
          contradicted.add(group[i]);
          contradicted.add(group[j]);
        }
      }
    }
  }
}

/** A train and the train it turns back as, before it is known to be the only answer. */
interface Coupling {
  readonly arrival: Turnback;
  readonly departure: Turnback;
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
