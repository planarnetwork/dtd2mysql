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
  Permanent = "Previous",
  Overlay = "O",
  New = "Next",
  Cancellation = "C"
}

export type IdGenerator = IterableIterator<number>;

