
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

  // where each divide happens along the train that is doing the dividing, and what comes off there
  const divides = new Map<string, Divide[]>();

  for (const link of links) {
    const dividing = byTripId.get(link.from);
    const leaving = byTripId.get(link.to);

    if (link.type !== AssociationType.Split || dividing === undefined || leaving === undefined) {
      continue;
    }

    const at = dividing.stopTimes.find(stopTime => stopTime.stop_id === link.location);

    if (at === undefined) {
      continue;
    }

    divides.set(link.from, [
      ...divides.get(link.from) ?? [],
      {at: at.stop_sequence, destination: destinationOf(leaving, stopNames)}
    ]);
  }

  if (divides.size === 0) {
    return [...schedules];
  }

  return schedules.map(schedule => {
    const dividing = schedule.stopTimes.length > 0 && divides.get(schedule.stopTimes[0].trip_id);

    return dividing ? named(schedule, dividing, destinationOf(schedule, stopNames)) : schedule;
  });
}

function named(schedule: Schedule, divides: Divide[], destination: string): Schedule {
  const inOrder = [...divides].sort((a, b) => a.at - b.at);

  return schedule.clone(schedule.calendar, schedule.id, schedule.stopTimes.map(stopTime => {
    // Still on board here: what the train ends up as, and everything that has yet to come off it.
    // Named once each - a train divides for the same place on more than one link where the schedule
    // it divides off has a permanent record and an overlay of it, and they are two trips.
    const carrying = [...new Set([
      destination,
      ...inOrder.filter(divide => divide.at > stopTime.stop_sequence).map(divide => divide.destination)
    ])];

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
