
import {Schedule} from "./Schedule";
import {ScheduleCalendar} from "./ScheduleCalendar";
import {CRS} from "../entity/Stop";
import {IdGenerator, OverlayRecord, STP, TUID} from "./OverlayRecord";
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
   * GTFS does not ask the two trips a coupling names to run on one service day, so the associated
   * schedule is published on the day its own record gives it and the transfer is allowed to cross a
   * day. `duplicateOvernight` is a workaround for journey planners that cannot follow one: it also
   * publishes the associated schedule on the base's service day, at times past 24:00.
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

    // How far apart the two trips end up is not the date indicator by itself. `shiftLateNightServices`
    // moves anything departing before 02:00 onto the previous service day, and it does that to the
    // base and to the associated schedule independently, so it both closes days the indicator opens
    // and opens days it does not. A next day association whose associated portion leaves at 00:35
    // needs no copy - the shift puts it on the base's day anyway - while a same day one whose base
    // leaves at 00:30 does, because the shift takes the base off the day they shared.
    const dayGap = this.dayOffset - dayShift(assoc) + dayShift(base);

    // A copy closes exactly one day, so it is worth making for a gap of one and nothing else. A gap
    // of -1 wants a copy on the day after, which would need a time before 00:00; a gap of 2 wants two
    // of them. Publishing one that does not close the gap leaves the same train in the feed twice and
    // still couples across a day, which is the worst of both.
    //
    // And not where the associated schedule is itself late night: `shiftLateNightServices` is about
    // to move it onto the very day the copy would sit on, at the very times the copy would carry, so
    // the copy would be the same trip written out again. That is a gap of one this cannot close.
    const duplicated = duplicateOvernight && dayGap === 1 && !isLateNight(assoc)
      // The base's day, at times past 24:00 - a train leaving Edinburgh at 04:30 reads as 28:30 the
      // day before, no use to anyone boarding it there, which is why it is a copy and not a move.
      ? asDated.copyToPreviousServiceDay(idGenerator.next().value)
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
   * How many service days after the base's own the associated schedule's record dates it.
   *
   * A date indicator neither source checks before casting reads as the same day, which is what
   * `inBaseDays` and `inAssocDays` make of one too.
   */
  private get dayOffset(): number {
    return this.dateIndicator === DateIndicator.Next ? 1
      : this.dateIndicator === DateIndicator.Previous ? -1
      : 0;
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
 * Whether `shiftLateNightServices` will take a day off this schedule before it is written.
 */
function dayShift(schedule: Schedule): number {
  return isLateNight(schedule) ? 1 : 0;
}

export interface AssociationApplication {
  /** the coupled days, told on the day the associated schedule's own record gives them */
  asDated: Schedule,
  /**
   * the same days told on the base's service day, at times past 24:00, or null unless
   * `duplicateOvernight` asked for it and a day was there to close
   */
  duplicated: Schedule | null,
  /**
   * the days the associated schedule runs uncoupled, or null where the association covers
   * every day it runs
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
