
import {Schedule, tripId as tripIdFor} from "./Schedule";
import {NO_DAYS, OverlapType, ScheduleCalendar} from "./ScheduleCalendar";
import {CRS, Stop} from "../entity/Stop";
import {IdGenerator, OverlayRecord, STP, TUID} from "./OverlayRecord";
import {StopTime} from "../entity/StopTime";
import {formatDuration, parseDuration, SECONDS_IN_DAY} from "./Duration";
import {maxDate, minDate} from "./PlainDate";

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
    return this.baseTUID + "_" + this.assocTUID + "_" + this.assocLocation;
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
   * Apply the join or split to the associated schedule. Check for any days that the associated service runs but the
   * association does not and create additional schedules to cover those periods.
   */
  public apply(base: Schedule, assoc: Schedule, idGenerator: IdGenerator): Schedule[] {
    const assocCalendar = this.dateIndicator === DateIndicator.Next ? this.calendar.shiftForward() :
        this.dateIndicator === DateIndicator.Previous ? this.calendar.shiftBackward() : this.calendar;
    const mergedBase = this.mergeSchedules(base, assoc);
    if (mergedBase === null) {
      // the association does not apply
      return [assoc];
    }
    const schedules = [mergedBase];

    // exclude the associated schedule from running when the association is active
    const excludeCalendar = assoc.calendar.addExcludeDays(assocCalendar);
    if (excludeCalendar !== null) {
      schedules.push(assoc.clone(excludeCalendar, idGenerator.next().value));
    }

    return schedules;
  }

  /**
   * Apply the split or join to the given schedules
   */
  private mergeSchedules(base: Schedule, assoc: Schedule): Schedule | null {
    let tuid: TUID;
    let start: StopTime[];
    let assocStop: StopTime;
    let end: StopTime[];

    const baseStopTime = base.stopAt(this.assocLocation);
    const assocStopTime = assoc.stopAt(this.assocLocation);

    // this should never happen, unless data feed is corrupted. It will prevent us from update failure
    if (baseStopTime === undefined || assocStopTime === undefined) {
      return null;
    }

    if (this.assocType === AssociationType.Split) {
      tuid = base.tuid + "_" + assoc.tuid;

      start = base.before(this.assocLocation);
      assocStop = this.mergeAssociationStop(baseStopTime, assocStopTime);
      end = assoc.after(this.assocLocation);
    }
    else {
      tuid = assoc.tuid + "_" + base.tuid;

      start = assoc.before(this.assocLocation);
      assocStop = this.mergeAssociationStop(assocStopTime, baseStopTime);
      end = base.after(this.assocLocation)
    }

    let stopSequence: number = 1;
    const calendar = this.dateIndicator === DateIndicator.Next ? assoc.calendar.shiftBackward() : assoc.calendar;
    const thisCalendar = this.dateIndicator === DateIndicator.Previous ? this.calendar.shiftBackward() : this.calendar;

    const newCalendar = calendar.clone(
        maxDate(thisCalendar.runsFrom, calendar.runsFrom),
        minDate(thisCalendar.runsTo, calendar.runsTo),
        NO_DAYS,
        {...calendar.excludeDays, ...thisCalendar.excludeDays}
    );
    if (newCalendar.isEmpty) {
      return null;
    }

    const tripId = tripIdFor(tuid, newCalendar);

    const stops = [
      ...start.map(s => this.cloneStop(s, stopSequence++, tripId, false)),
      this.cloneStop(assocStop, stopSequence++, tripId, false),
      ...end.map(s => this.cloneStop(s, stopSequence++, tripId, this.assocType === AssociationType.Split && this.dateIndicator === DateIndicator.Next || this.assocType === AssociationType.Join && this.dateIndicator === DateIndicator.Previous))
    ];


    return new Schedule(
      assoc.id,
      stops,
      tuid,
      assoc.rsid,
      // only take the part of the schedule that the association applies to
      newCalendar,
      assoc.mode,
      assoc.operator,
      assoc.stp,
      assoc.firstClassAvailable,
      assoc.reservationPossible
    )
  }

  /**
   * Take the arrival time of the first stop and the departure time of the second stop and put them into a new stop
   */
  public mergeAssociationStop(arrivalStop: StopTime, departureStop: StopTime): StopTime {
    let arrivalTime = parseDuration(arrivalStop.arrival_time);
    let departureTime = parseDuration(departureStop.departure_time);

    if (arrivalTime > departureTime) {
      if (this.dateIndicator === DateIndicator.Next) {
        departureTime += SECONDS_IN_DAY;
      }
      else {
        arrivalTime = parseDuration(departureStop.arrival_time);
      }
    }

    return Object.assign({}, arrivalStop, {
      arrival_time: formatDuration(arrivalTime),
      departure_time: formatDuration(departureTime),
      pickup_type: departureStop.pickup_type,
      drop_off_type: arrivalStop.drop_off_type
    });
  }

  /**
   * Clone the given stop overriding the sequence number and modifying the arrival/departure times if necessary
   */
  private cloneStop(stop: StopTime, stopSequence: number, tripId: string, nextDay: boolean): StopTime {
    let departureTime = stop.departure_time ? parseDuration(stop.departure_time) : null;
    let arrivalTime = stop.arrival_time ? parseDuration(stop.arrival_time) : null;
    if (nextDay) {
      if (departureTime !== null) departureTime += SECONDS_IN_DAY;
      if (arrivalTime !== null) arrivalTime += SECONDS_IN_DAY;
    }


    return Object.assign({}, stop, {
      arrival_time: arrivalTime ? formatDuration(arrivalTime) : null,
      departure_time: departureTime ? formatDuration(departureTime) : null,
      stop_sequence: stopSequence,
      trip_id: tripId
    });
  }
  
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
