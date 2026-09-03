
import {Schedule} from "./Schedule";
import {ScheduleCalendar} from "./ScheduleCalendar";
import {CRS} from "../entity/Stop";
import {IdGenerator, OverlayRecord, STP, TUID} from "./OverlayRecord";
import {StopTime} from "../entity/StopTime";

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
   * Couple the two trains, without joining them into one trip.
   *
   * **Only the associated schedule is narrowed.** A transfer applies on the days both its trips
   * run, and the coupled days are a subset of the base's, so cutting one side is exact and leaves
   * the base's through service in one piece.
   *
   * Null where the association cannot apply: a location one of them does not call at, or no day on
   * which both run and the association is in force.
   */
  public apply(base: Schedule, assoc: Schedule, idGenerator: IdGenerator): AssociationApplication | null {
    // this should never happen, unless data feed is corrupted. It will prevent us from update failure
    if (base.stopAt(this.assocLocation) === undefined || assoc.stopAt(this.assocLocation) === undefined) {
      return null;
    }

    if (this.assocType !== AssociationType.Join && this.assocType !== AssociationType.Split) {
      return null;
    }

    const coupled = base.calendar
      .intersect(this.inBaseDays(assoc.calendar))
      .intersect(this.calendar);

    if (coupled.isEmpty) {
      return null;
    }

    // A transfer carries no calendar, so the two trips want to be on the same service day. Only a
    // next day schedule can be moved onto the base's: one running before it would need a time
    // before 00:00. Those keep their own day and the coupling crosses one.
    const onBasesDay = this.dateIndicator === DateIndicator.Next;

    const associated = assoc.clone(
      onBasesDay ? coupled : this.inAssocDays(coupled),
      idGenerator.next().value,
      onBasesDay ? assoc.stopTimes.map(aDayLater) : assoc.stopTimes
    );
    const withoutIt = assoc.calendar.addExcludeDays(this.inAssocDays(coupled));

    return {
      associated,
      unassociated: withoutIt === null ? null : assoc.clone(withoutIt, idGenerator.next().value),
      link: this.assocType === AssociationType.Join
        ? {from: associated.id, to: base.id, location: this.assocLocation, type: this.assocType}
        : {from: base.id, to: associated.id, location: this.assocLocation, type: this.assocType}
    };
  }

  /**
   * A calendar counted in the associated schedule's service days, told in the base's.
   */
  public inBaseDays(calendar: ScheduleCalendar): ScheduleCalendar {
    return this.dateIndicator === DateIndicator.Next ? calendar.shiftBackward()
      : this.dateIndicator === DateIndicator.Previous ? calendar.shiftForward()
      : calendar;
  }

  /**
   * A calendar counted in the base's service days, told in the associated schedule's.
   */
  public inAssocDays(calendar: ScheduleCalendar): ScheduleCalendar {
    return this.dateIndicator === DateIndicator.Next ? calendar.shiftForward()
      : this.dateIndicator === DateIndicator.Previous ? calendar.shiftBackward()
      : calendar;
  }

}

/**
 * A call told on the day after the one it came with, so 00:35 becomes 24:35.
 */
function aDayLater(stopTime: StopTime): StopTime {
  return Object.assign({}, stopTime, {
    arrival_time: plusADay(stopTime.arrival_time),
    departure_time: plusADay(stopTime.departure_time)
  });
}

function plusADay(time: string): string {
  return (parseInt(time.substr(0, 2), 10) + 24) + time.substr(2);
}

export interface AssociationApplication {
  /** told in the base's service day, which is not always its own */
  associated: Schedule,
  unassociated: Schedule | null,
  link: AssociationLink
}

/**
 * Named by `Schedule.id` because the trip ids are not settled until `mergeSchedules` has resolved
 * the collisions between them.
 */
export interface AssociationLink {
  from: number,
  to: number,
  location: CRS,
  /** which way round it is: a split leaves from the train that divides, a join arrives at it */
  type: AssociationType
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
