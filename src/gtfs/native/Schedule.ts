
import {StopTime} from "../file/StopTime";
import {ScheduleCalendar} from "./ScheduleCalendar";

export class Schedule {

  constructor(
    public readonly id: number,
    public readonly stopTimes: StopTime[],
    public readonly tuid: TUID,
    public readonly rsid: RSID,
    public readonly calendar: ScheduleCalendar,
    public readonly stp: STP
  ) {}

  public get isCancellation(): boolean {
    return this.stp === STP.Cancellation;
  }

}

export type TUID = string;
export type RSID = string;

export enum STP {
  Permenant = "P",
  Cancellation = "C",
  Overlay = "O"
}
