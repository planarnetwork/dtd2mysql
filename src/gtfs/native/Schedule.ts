
import {StopTime} from "../file/StopTime";
import {ScheduleCalendar} from "./ScheduleCalendar";
import {Trip} from "../file/Trip";

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

  public toTrip(serviceId: string): Trip {
    return {
      route_id: "0",
      service_id: serviceId,
      trip_id: this.id,
      trip_headsign: this.tuid,
      trip_short_name: this.rsid,
      direction_id: 0,
      block_id: "0",
      shape_id: "0",
      wheelchair_accessible: 0,
      bikes_allowed: 0
    };
  }

}

export type TUID = string;
export type RSID = string;

export enum STP {
  Permenant = "P",
  Cancellation = "C",
  Overlay = "O"
}
