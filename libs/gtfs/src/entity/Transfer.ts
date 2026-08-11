import {Duration} from "../model/Duration";

/**
 * A transfer may be interchange at a particular station (where the fromStopId and toStopId are the same) or a fixed
 * leg between two different stations (a walk or tube).
 */
export interface Transfer {
  from_stop_id: StopID,
  to_stop_id: StopID,
  transfer_type: TransferType,
  min_transfer_time: Duration,

  /**
   * Everything the DTD says about a fixed link that GTFS has no field for.
   *
   * These are producer extensions. The spec lets a producer add fields it does
   * not define and requires consumers to ignore ones they do not recognise, so
   * a reader that wants only standard transfers sees a standard file.
   *
   * They exist because the alternative was deletion. `links.txt` held the mode,
   * the operating window and the days, `transfers.txt` has nowhere for any of
   * it, and no other file in the spec does either. Unlike platforms, which have
   * a documented pattern, a conditional transfer has none.
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
 * 3 char CRS code (e.g. TBW)
 */
export type StopID = string;

export enum TransferType {
  Recommended = 0,
  Timed = 1,
  MinTime = 2,
  NotPossible = 3
}

