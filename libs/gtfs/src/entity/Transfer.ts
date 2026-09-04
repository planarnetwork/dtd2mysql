import {Duration} from "../model/Duration";

/**
 * A transfer may be interchange at a particular station (where the fromStopId and toStopId are the same), a fixed
 * leg between two different stations (a walk or tube), or a split or join.
 */
export interface Transfer {
  from_stop_id: StopID,
  to_stop_id: StopID,
  from_trip_id: string | null,
  to_trip_id: string | null,
  transfer_type: TransferType,
  min_transfer_time: Duration | null,

  /**
   * Everything the DTD says about a fixed link that GTFS has no field for.
   *
   * These are producer extensions. The spec lets a producer add fields it does
   * not define and requires consumers to ignore ones they do not recognise, so
   * a reader that wants only standard transfers sees a standard file.
   *
   * The spec has nowhere else for them: a conditional transfer has no
   * documented pattern, unlike a platform. They are here or they are lost.
   *
   * Null on a station interchange row, where there is no link to describe.
   */
  mode: string | null,
  start_time: string | null,
  end_time: string | null,
  start_date: string | null,
  end_date: string | null,
  monday: 0 | 1 | null,
  tuesday: 0 | 1 | null,
  wednesday: 0 | 1 | null,
  thursday: 0 | 1 | null,
  friday: 0 | 1 | null,
  saturday: 0 | 1 | null,
  sunday: 0 | 1 | null
}

/**
 * A station: the 3 char CRS code (e.g. `TBW`) as a source describes a transfer,
 * and the station's ATCO code (`910GTONBDG`) once `mergeTransfers` has put the
 * rows in the terms the feed publishes.
 */
export type StopID = string;

export enum TransferType {
  Recommended = 0,
  Timed = 1,
  MinTime = 2,
  NotPossible = 3,
  InSeat = 4
}

/**
 * transfers.txt, as it is written. Every field of Transfer is a column of it.
 */
export type TransferRow = Transfer;
