
import {Schedule} from "../model/Schedule";
import {AssociationLink} from "../model/Association";
import {Transfer, TransferType} from "../entity/Transfer";
import {CRS, TIPLOC} from "../entity/Stop";
import {stopId} from "./Platforms";

/**
 * A coupling, once the trip ids are settled. `AssociationLink` is the same thing before that.
 */
export interface TripLink {
  from: string,
  to: string,
  location: CRS
}

/**
 * Tell each coupling which trips it names.
 *
 * `mergeSchedules` is what settles a trip id, and `addLateNightServices` carries the one it settled
 * onto the clones it makes, so this is the point where a link can be resolved once and stay right.
 */
export function resolveLinks(links: readonly AssociationLink[], schedules: readonly Schedule[]): TripLink[] {
  const tripIds = new Map<number, string>();
  // a record id handed out twice would couple the wrong pair of trains rather than fail
  const ambiguous = new Set<number>();

  for (const schedule of schedules) {
    if (schedule.stopTimes.length === 0) {
      continue;
    }

    if (tripIds.has(schedule.id)) {
      ambiguous.add(schedule.id);
    }

    tripIds.set(schedule.id, schedule.stopTimes[0].trip_id);
  }

  const resolved = links.flatMap(link => {
    const from = tripIds.get(link.from);
    const to = tripIds.get(link.to);

    return from === undefined || to === undefined || ambiguous.has(link.from) || ambiguous.has(link.to)
      ? []
      : [{from, to, location: link.location}];
  });

  // A schedule can be the base of one association and the portion of another, and applying the
  // second replaces it, so the first coupling is left naming something that no longer exists
  const dropped = links.length - resolved.length;

  if (dropped > 0) {
    console.log(
      `${dropped} coupling(s) dropped for a schedule a later association replaced` +
      (ambiguous.size > 0 ? `, ${ambiguous.size} of them for a schedule id handed out more than once` : "")
    );
  }

  return resolved;
}

/**
 * The couplings, as transfers.txt rows.
 *
 * Neither trip is cut at the coupling - the spec anchors the link with a stop id and only asks that
 * the trip calls there - so the through service either train offers stays in one piece.
 *
 * **No calendar.** `applyAssociations` has already cut the portion to the days it is coupled, and a
 * transfer applies on the days both its trips run, so the trips say when the coupling happens.
 *
 * Each side keeps the stop its own schedule named. The source sometimes disagrees with itself about
 * the platform - on 2026-09-20 the Cardiff portion arrives at Swansea platform 3 and the train it
 * joins leaves platform 1 - and there is nothing to reconcile, because each stop is only ever
 * checked against its own trip.
 */
export function linkedTrips(
  links: readonly TripLink[],
  schedules: readonly Schedule[],
  tiplocs: ReadonlyMap<CRS, TIPLOC>
): Transfer[] {
  const byTripId = new Map<string, Schedule>();

  // A schedule left with one stop is not written as a trip, so indexing only what reaches trips.txt
  // is what stops a link dangling
  for (const schedule of schedules) {
    if (schedule.stopTimes.length > 1) {
      byTripId.set(schedule.stopTimes[0].trip_id, schedule);
    }
  }

  const rows: Transfer[] = [];
  let dropped = 0;

  for (const link of links) {
    // dropUnknownStops can take the coupling point out of a trip, leaving nothing to hang it on
    const from = byTripId.get(link.from)?.stopAt(link.location);
    const to = byTripId.get(link.to)?.stopAt(link.location);

    if (from === undefined || to === undefined) {
      dropped++;
      continue;
    }

    rows.push({
      from_stop_id: stopId(from, tiplocs),
      to_stop_id: stopId(to, tiplocs),
      from_trip_id: link.from,
      to_trip_id: link.to,
      transfer_type: TransferType.InSeat,
      min_transfer_time: null,
      mode: null,
      start_time: null,
      end_time: null,
      start_date: null,
      end_date: null,
      monday: null,
      tuesday: null,
      wednesday: null,
      thursday: null,
      friday: null,
      saturday: null,
      sunday: null
    });
  }

  if (links.length > 0) {
    console.log(
      `Linked ${rows.length} pair(s) of trips with an in-seat transfer` +
      (dropped > 0 ? `, ${dropped} dropped for a trip or a stop the feed does not publish` : "")
    );
  }

  return rows;
}
