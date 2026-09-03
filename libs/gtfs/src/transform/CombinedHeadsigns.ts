
import {Schedule} from "../model/Schedule";
import {AssociationType} from "../model/Association";
import {TripLink} from "./LinkedTrips";
import {CRS} from "../entity/Stop";
import {StopTime} from "../entity/StopTime";

/**
 * Name every destination a train is still carrying, at the stops before it divides.
 *
 * A trip is headed for where it ends, so the London Bridge to Caterham says Caterham and never
 * mentions the front half coming off at Purley for Tattenham Corner - which the concatenation used
 * to say by accident. The answer changes partway along, which is what `stop_headsign` is for.
 *
 * Joins need none of it: once two trains are one they have a single destination.
 */
export function combinedHeadsigns(
  schedules: readonly Schedule[],
  links: readonly TripLink[],
  stopNames: ReadonlyMap<CRS, string>
): Schedule[] {
  const byTripId = new Map<string, Schedule>();

  for (const schedule of schedules) {
    if (schedule.stopTimes.length > 0) {
      byTripId.set(schedule.stopTimes[0].trip_id, schedule);
    }
  }

  const splitLinks = links.filter(link => link.type === AssociationType.Split);
  const divides = new Map<string, Divide[]>();

  for (const link of splitLinks) {
    const at = byTripId.get(link.from)?.stopTimes.find(stopTime => stopTime.stop_id === link.location);
    const leaving = byTripId.get(link.to);

    // dropUnknownStops can take the trip out of the feed, or the stop out of the trip. linkedTrips
    // reports the couplings it costs.
    if (at !== undefined && leaving !== undefined) {
      const dividing = divides.get(link.from) ?? [];

      dividing.push({at: at.stop_sequence, destination: destinationOf(leaving, stopNames)});
      divides.set(link.from, dividing);
    }
  }

  return schedules.map(schedule => {
    const dividing = divides.get(schedule.stopTimes[0]?.trip_id);

    return dividing === undefined ? schedule : named(schedule, dividing, destinationOf(schedule, stopNames));
  });
}

function named(schedule: Schedule, divides: Divide[], destination: string): Schedule {
  const coming = divides.toSorted((a, b) => a.at - b.at);

  return schedule.clone(schedule.calendar, schedule.id, schedule.stopTimes.map(stopTime => {
    const carrying = [destination];

    for (const divide of coming) {
      // Once each: a schedule with a permanent record and an overlay of it is two trips dividing
      // off for the same place.
      if (divide.at > stopTime.stop_sequence && !carrying.includes(divide.destination)) {
        carrying.push(divide.destination);
      }
    }

    return carrying.length > 1 ? withHeadsign(stopTime, and(carrying)) : stopTime;
  }));
}

function withHeadsign(stopTime: StopTime, stop_headsign: string): StopTime {
  return Object.assign({}, stopTime, {stop_headsign});
}

function destinationOf(schedule: Schedule, stopNames: ReadonlyMap<CRS, string>): string {
  return stopNames.get(schedule.destination) ?? schedule.destination;
}

function and(names: string[]): string {
  return names.length === 2
    ? names.join(" and ")
    : names.slice(0, -1).join(", ") + " and " + names[names.length - 1];
}

type Divide = {
  at: number,
  destination: string
}
