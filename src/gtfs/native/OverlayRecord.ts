import {ScheduleCalendar} from "./ScheduleCalendar";

export interface OverlayRecord {
  calendar: ScheduleCalendar;
  stp: STP;
  id: number;
  tuid: TUID;
  hash: string;

  clone(calendar: ScheduleCalendar, scheduleId: number): OverlayRecord;
}


export type TUID = string;
export type RSID = string;

export enum STP {
  Permanent = "P",
  Overlay = "O",
  New = "N",
  Cancellation = "C"
}

export type IdGenerator = IterableIterator<number>;

