import {Duration} from "../native/Duration";

/**
 * A transfer may be interchange at a particular station (where the fromStopId and toStopId are the same) or a fixed
 * leg between two different stations (a walk or tube).
 */
export interface Transfer {
  from_stop_id: StopID,
  to_stop_id: StopID,
  transfer_type: TransferType,
  duration: Duration
}

/**
 * 3 char CRS code (e.g. TBW)
 */
export type StopID = string;

export enum TransferType {
  Recommended = 0,
  Timed = 1,
  MinTime = 2,
  NotPossible = 3
}

