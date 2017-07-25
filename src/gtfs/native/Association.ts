
import {Schedule} from "./Schedule";
import {OverlapType, ScheduleCalendar} from "./ScheduleCalendar";
import {CRS, Stop} from "../file/Stop";
import {Duration, Moment} from "moment";
import {OverlayRecord, STP, TUID} from "./OverlayRecord";
import {StopTime} from "../file/StopTime";
import moment = require("moment");
import {formatDuration} from "./Duration";

export class Association implements OverlayRecord {

  constructor(
    public readonly id: number,
    public readonly baseTUID: TUID,
    public readonly assocTUID: TUID,
    public readonly assocLocation: CRS,
    public readonly dateIndicator: DateIndicator,
    public readonly assocType: AssociationType,
    public readonly calendar: ScheduleCalendar,
    public readonly stp: STP
  ) { }

  public get tuid(): TUID {
    return this.baseTUID + "_" + this.assocTUID + "_";
  }

  public get hash(): string {
    return this.tuid + this.assocLocation + this.calendar.binaryDays;
  }

  /**
   * Clone the association with a different calendar
   */
  public clone(calendar: ScheduleCalendar, id: number): Association {
    return new Association(
      id,
      this.baseTUID,
      this.assocTUID,
      this.assocLocation,
      this.dateIndicator,
      this.assocType,
      calendar,
      this.stp
    );
  }

  /**
   * Apply the split or join to the given schedules
   */
  public apply(base: Schedule, assoc: Schedule): Schedule {
    let tuid: TUID;
    let start: StopTime[];
    let assocStop: StopTime;
    let end: StopTime[];

    if (this.assocType === AssociationType.Split) {
      tuid = base.tuid + "_" + assoc.tuid;

      start = base.before(this.assocLocation);
      assocStop = mergeAssociationStop(base.stopAt(this.assocLocation), assoc.stopAt(this.assocLocation));
      end = assoc.after(this.assocLocation);
    }
    else {
      tuid = assoc.tuid + "_" + base.tuid;

      start = assoc.before(this.assocLocation);
      assocStop = mergeAssociationStop(assoc.stopAt(this.assocLocation), base.stopAt(this.assocLocation));
      end = base.after(this.assocLocation)
    }

    let stopSequence: number = 1;

    const stops = [
      ...start.map(s => cloneStop(s, stopSequence++, assoc.id)),
      cloneStop(assocStop, stopSequence++, assoc.id),
      ...end.map(s => cloneStop(s, stopSequence++, assoc.id, assocStop))
    ];

    return new Schedule(
      assoc.id,
      stops,
      tuid,
      assoc.rsid,
      this.dateIndicator === DateIndicator.Next ? assoc.calendar.shiftBackward() : assoc.calendar,
      assoc.mode,
      assoc.operator,
      assoc.stp
    )
  }

}

/**
 * Take the arrival time of the first stop and the departure time of the second stop and put them into a new stop
 */
function mergeAssociationStop(arrivalStop: StopTime, departureStop: StopTime): StopTime {
  const arrivalTime = moment.duration(arrivalStop.arrival_time);
  const departureTime = moment.duration(departureStop.departure_time);
  const departs = arrivalTime.asSeconds() <= departureTime.asSeconds() ? departureTime : departureTime.add(1, "day");

  return Object.assign({}, arrivalStop, {
    departure_time: formatDuration(departs.asSeconds()),
    pickup_type: departureStop.pickup_type,
    drop_off_type: arrivalStop.drop_off_type
  });
}

/**
 * Clone the given stop overriding the sequence number and modifying the arrival/departure times if necessary
 */
function cloneStop(stop: StopTime, stopSequence: number, tripId: number, assocStop: StopTime | null = null): StopTime {
  const assocTime = moment.duration(assocStop && assocStop.arrival_time ? assocStop.arrival_time : "00:00");
  const departureTime = moment.duration(stop.departure_time);

  if (departureTime && departureTime.asSeconds() < assocTime.asSeconds()) {
    departureTime.add(1, "day");
  }

  const arrivalTime = moment.duration(stop.arrival_time);

  if (arrivalTime && arrivalTime.asSeconds() < assocTime.asSeconds()) {
    arrivalTime.add(1, "day");
  }

  return Object.assign({}, stop, {
    arrival_time: formatDuration(arrivalTime.asSeconds()),
    departure_time: formatDuration(departureTime.asSeconds()),
    stop_sequence: stopSequence,
    trip_id: tripId
  });
}

export enum DateIndicator {
  Same = "S",
  Next = "N",
  Previous = "P"
}

export enum AssociationType {
  Split = "VV",
  Join = "JJ",
  NA = ""
}