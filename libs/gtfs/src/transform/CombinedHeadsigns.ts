
import {Schedule} from "../model/Schedule";
import {AssociationType} from "../model/Association";
import {TripLink} from "./LinkedTrips";
import {CRS} from "../entity/Stop";
import {StopTime} from "../entity/StopTime";

/**
 * Name every destination a train is still carrying, at the stops before it divides.
 *
 * A trip is headed for where it ends, so the London Bridge to Caterham says Caterham - and a
 * passenger boarding it is not told that the front half comes off at Purley for Tattenham Corner.
 * The concatenation used to say it by accident, in a trip that ran through to one of the two.
 *
 * `stop_headsign` overrides the trip headsign at a stop, which is where the answer belongs, because
 * it changes partway along: "Caterham and Tattenham Corner" as far as Purley Oaks, and Caterham from
 * Purley on. A train that divides twice names all three until the first divide, and only what is
 * left after it.
 *
 * Joins need none of this. Once two trains are one they have a single destination, which is the
 * trip headsign already.
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
  // where each divide happens along the train that is doing the dividing, and what comes off there
  const divides = new Map<string, Divide[]>();

  for (const link of splitLinks) {
    const at = byTripId.get(link.from)?.stopTimes.find(stopTime => stopTime.stop_id === link.location);
    const leaving = byTripId.get(link.to);

    // dropUnknownStops can take a trip out of the feed, or the stop it divides at out of the trip.
    // linkedTrips counts the same couplings going the same way, so nothing is lost by passing over
    // them here.
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
    // what the train ends up as, and everything still to come off it, in the order it does
    const carrying = [destination];

    for (const divide of coming) {
      // Once each. A train divides for the same place on two links where the schedule that leaves
      // has a permanent record and an overlay of it, because those are two trips.
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
  /** the stop sequence the train divides at, which still reads as the destination it is left with */
  at: number,
  destination: string
}
