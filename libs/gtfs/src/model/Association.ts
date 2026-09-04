
import {Schedule} from "./Schedule";
import {ScheduleCalendar} from "./ScheduleCalendar";
import {CRS} from "../entity/Stop";
import {IdGenerator, OverlayRecord, STP, TUID} from "./OverlayRecord";
import {StopTime} from "../entity/StopTime";
import {isLateNight} from "../transform/ShiftLateNightServices";

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
   * The base is left as it is, and the associated schedule gives the trip the coupling names. A
   * transfer applies on the days both its trips run, and the coupled days are a subset of the
   * base's, so cutting one side is enough to say when it happens.
   *
   * Null where the association cannot apply: a location one of them does not call at, or no day on
   * which both run and the association is in force.
   * 
   * GTFS does not require that the base schedule and the assoc schedule to operate on the same day.
   * However, the `duplicateOvernight` parameter is given as a workaround for journey planners which can only
   * handle linked trips running on the same day, by creating a duplicate of the associated portion
   * departing on the day the base departs, and shifting the times by a day.
   */
  public apply(base: Schedule, assoc: Schedule, idGenerator: IdGenerator, duplicateOvernight: boolean): AssociationApplication | null {
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
    
    const asDated = assoc.clone(this.inAssocDays(coupled), idGenerator.next().value);

    // Some legacy journey planner can only handle linked trips which run on the same service day. If dayShift is true,
    // we create a duplicate of the assoc schedule which runs on the base day.
    // 
    // In the duplicated schedule, a train leaving Edinburgh at 04:30 coming off a sleeper portion
    // reads as 28:40 the day before, which helps those journey planners to link it to the base.
    
    // Only a next day schedule can be copied onto the base's: one running before it would need a time
    // before 00:00. Those keep their own day and the coupling crosses one.
    //
    // If shiftLateNightServices will move the assoc schedule on the next day back, they will run on the same GTFS day
    // so the duplication is not needed.
    const needToDuplicate = duplicateOvernight && this.dateIndicator === DateIndicator.Next && !isLateNight(assoc);

    const duplicated = needToDuplicate 
        ? assoc.copyToPreviousServiceDay().clone(coupled, idGenerator.next().value)
        : null;
    
    const unassociatedCalendar = assoc.calendar.addExcludeDays(this.inAssocDays(coupled));

    return {
      asDated,
      duplicated,
      link: this.assocType === AssociationType.Join
        ? {from: (duplicated ?? asDated).id, to: base.id, location: this.assocLocation, type: this.assocType}
        : {from: base.id, to: (duplicated ?? asDated).id, location: this.assocLocation, type: this.assocType},
      unassociated: unassociatedCalendar === null ? null : assoc.clone(unassociatedCalendar, idGenerator.next().value)
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

export interface AssociationApplication {
  /** told in the day its own record gives */
  asDated: Schedule,
  /** 
   * told in the base's service day, which is what the coupling names, 
   * or null if the assoc and the base run on the same service day 
   */
  duplicated: Schedule | null,
  /**
   * a copy of the schedule where the association does not apply,
   * null if the association fully applies.
   */
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
