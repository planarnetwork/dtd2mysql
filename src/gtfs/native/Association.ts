
import {Schedule} from "./Schedule";
import {OverlapType, ScheduleCalendar} from "./ScheduleCalendar";
import {CRS, Stop} from "../file/Stop";
import {Duration, Moment} from "moment";
import {OverlayRecord, STP, TUID} from "./OverlayRecord";
import {StopTime} from "../file/StopTime";
import moment = require("moment");

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
    let stops: StopTime[];
    let tuid: TUID;

    if (this.assocType === AssociationType.Split) {
      const assocIndex = base.stopTimes.findIndex(s => s.stop_id === this.assocLocation);
      const baseStops = base.stopTimes.slice(0, assocIndex);
      const arrivalTime = moment.duration(base.stopTimes[assocIndex].arrival_time || "00:00");
      let stopSequence = base.stopTimes[assocIndex].stop_sequence;
      const assocStops = assoc.stopTimes.map(s => cloneStop(arrivalTime, stopSequence++, s));

      stops = baseStops.concat(assocStops);
      tuid = base.tuid + "_" + assoc.tuid;
    }
    else {
      const assocIndex = base.stopTimes.findIndex(s => s.stop_id === this.assocLocation);
      const assocStops = assoc.stopTimes.slice(0, -1);
      const arrivalTime = moment.duration(base.stopTimes[assocIndex].arrival_time || "00:00");
      let stopSequence = assocStops[assocStops.length -1].stop_sequence + 1;
      const baseStops = base.stopTimes
        .slice(assocIndex)
        .map(s => cloneStop(arrivalTime, stopSequence++, s));

      stops = assocStops.concat(baseStops);
      tuid = assoc.tuid + "_" + base.tuid;
    }

    return new Schedule(
      this.id,
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
 * Clone the given stop overriding the sequence number and modifying the arrival/departure times if necessary
 */
function cloneStop(assocTime: Duration, stopSequence: number, stop: StopTime): StopTime {
  const departureTime = stop.departure_time ? moment.duration(stop.departure_time) : null;

  if (departureTime && departureTime.asSeconds() < assocTime.asSeconds()) {
    departureTime.add(1, "day");
  }

  const arrivalTime = stop.arrival_time ? moment.duration(stop.arrival_time) : null;

  if (arrivalTime && arrivalTime.asSeconds() < assocTime.asSeconds()) {
    arrivalTime.add(1, "day");
  }

  return Object.assign({}, stop, {
    arrival_time: arrivalTime ? formatDuration(arrivalTime.asSeconds()) : null,
    departure_time: departureTime ? formatDuration(departureTime.asSeconds()) : null,
    stop_sequence: stopSequence
  });
}

function formatDuration(duration: number): string {
  const hours = Math.floor(duration / 3600);
  const hoursFormatted = hours < 10 ? "0" + hours : hours;
  const mins = Math.floor((duration % 3600) / 60);
  const minsFormatted = mins < 10 ? "0" + mins : mins;

  return `${hoursFormatted}:${minsFormatted}:00`;
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