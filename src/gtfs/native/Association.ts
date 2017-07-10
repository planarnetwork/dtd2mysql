
import {Schedule} from "./Schedule";
import {ScheduleCalendar} from "./ScheduleCalendar";
import {CRS} from "../file/Stop";
import {Moment} from "moment";
import {OverlayRecord, STP, TUID} from "./OverlayRecord";

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

  public getBaseSchedule(schedules: Schedule[]): Schedule[] {
    return this.findSchedules(schedules, this.calendar.runsFrom, this.calendar.runsTo);
  }

  public getAssocSchedule(schedules: Schedule[]): Schedule[] {
    const startDate = this.calendar.runsFrom.clone().add(this.dateIndicator, "days");
    const endDate = this.calendar.runsTo.clone().add(this.dateIndicator, "days");

    return this.findSchedules(schedules, startDate, endDate);
  }

  private findSchedules(schedules: Schedule[], startDate: Moment, endDate: Moment): Schedule[] {
    return schedules.filter(schedule => (schedule.calendar.binaryDays & this.calendar.binaryDays) > 0 &&
                                         schedule.calendar.runsFrom.isSameOrBefore(startDate) &&
                                         schedule.calendar.runsTo.isSameOrAfter(endDate)
    );
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

}

export enum DateIndicator {
  S = 0,
  N = 1,
}

export enum AssociationType {
  Split = "VV",
  Join = "JJ",
  NA = ""
}