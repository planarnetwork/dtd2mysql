
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
   * A join or a split is two trains sharing a vehicle for part of their run, which is what
   * `transfer_type=4` says. Concatenating them claimed something else - one train through to the
   * base's destination - and where the portion came from where the base is going, that trip doubles
   * back on itself.
   *
   * **Only the portion is narrowed.** A transfer applies on the days both its trips run, and the
   * coupled days are a subset of the base's, so cutting one side is exact and leaves the base's
   * through service in one piece.
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

    // A transfer carries no calendar, so the two trips want to agree which day they are coupled on.
    // A portion running over a midnight the base has not reached yet is told on the base's service
    // day, with the day change in the times: 04:28 out of Edinburgh becomes 28:28 on the day the
    // sleeper left Euston. One running *before* the base's day cannot be - GTFS has no time before
    // 00:00 - so it keeps its own day and the coupling crosses one, which the spec allows where the
    // trip being joined is on the subsequent service day.
    const onBasesDay = this.dateIndicator === DateIndicator.Next;

    const portion = assoc.clone(
      onBasesDay ? coupled : this.inAssocDays(coupled),
      idGenerator.next().value,
      onBasesDay ? assoc.stopTimes.map(aDayLater) : assoc.stopTimes
    );
    const alone = assoc.calendar.addExcludeDays(this.inAssocDays(coupled));

    return {
      portion,
      alone: alone === null ? null : assoc.clone(alone, idGenerator.next().value),
      link: this.assocType === AssociationType.Join
        ? {from: portion.id, to: base.id, location: this.assocLocation}
        : {from: base.id, to: portion.id, location: this.assocLocation}
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
 * A call told on the day after the one it came with. Hours are not capped at 24 - that is the point
 * of it - so 00:35 becomes 24:35.
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
  /** the associated schedule on the days it is coupled, told in the base's service day */
  portion: Schedule,
  /** the associated schedule on the days it runs by itself, or null where there are none */
  alone: Schedule | null,
  link: AssociationLink
}

/**
 * Two trips a passenger rides through without changing train, and where one becomes the other.
 *
 * Named by `Schedule.id` because the trip ids are not settled until `mergeSchedules` has resolved
 * the collisions between them.
 */
export interface AssociationLink {
  from: number,
  to: number,
  location: CRS
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
