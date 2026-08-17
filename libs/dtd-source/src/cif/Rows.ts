import {AssociationType, DateIndicator, FixedLinkRecord, StationRecord, STP} from "@gb-transit/gtfs";
import {Row} from "./MemoryTable";

/**
 * Reading a field out of a parsed record.
 *
 * A `Row` is whatever the record layout produced, so a field name that does not
 * match one gives `undefined` and, cast to the type the caller wanted, travels a
 * long way before anything notices. These check, and name the field when they
 * fail, so a layout that changes shape stops the build where the mistake is.
 */
export function text(row: Row, field: string): string {
  const value = row[field];

  if (typeof value !== "string") {
    throw new Error(`Expected ${field} to be text, got ${describe(value)}`);
  }

  return value;
}

export function optionalText(row: Row, field: string): string | null {
  const value = row[field];

  if (value !== null && typeof value !== "string") {
    throw new Error(`Expected ${field} to be text or null, got ${describe(value)}`);
  }

  return value;
}

export function integer(row: Row, field: string): number {
  const value = row[field];

  if (typeof value !== "number") {
    throw new Error(`Expected ${field} to be a number, got ${describe(value)}`);
  }

  return value;
}

export function optionalInteger(row: Row, field: string): number | null {
  const value = row[field];

  if (value !== null && typeof value !== "number") {
    throw new Error(`Expected ${field} to be a number or null, got ${describe(value)}`);
  }

  return value;
}

export function flag(row: Row, field: string): 0 | 1 {
  const value = integer(row, field);

  if (value !== 0 && value !== 1) {
    throw new Error(`Expected ${field} to be 0 or 1, got ${value}`);
  }

  return value;
}

function describe(value: unknown): string {
  return value === undefined ? "nothing" : `${typeof value} ${JSON.stringify(value)}`;
}

/**
 * The days a record runs, in the order ScheduleCalendar indexes them.
 */
export function days(row: Row) {
  return {
    0: flag(row, "sunday"),
    1: flag(row, "monday"),
    2: flag(row, "tuesday"),
    3: flag(row, "wednesday"),
    4: flag(row, "thursday"),
    5: flag(row, "friday"),
    6: flag(row, "saturday")
  };
}

/**
 * An MSN station record, as getStops and getTransfers need it.
 */
export function stationRecord(row: Row): StationRecord {
  return {
    crs_code: text(row, "crs_code"),
    tiploc_code: text(row, "tiploc_code"),
    station_name: text(row, "station_name"),
    cate_interchange_status: optionalInteger(row, "cate_interchange_status"),
    easting: integer(row, "easting"),
    northing: integer(row, "northing")
  };
}

export interface AssociationRow {
  readonly id: number;
  readonly base_uid: string;
  readonly assoc_uid: string;
  readonly assoc_location: string;
  readonly start_date: string;
  readonly end_date: string;
  readonly assoc_date_ind: DateIndicator;
  readonly assoc_cat: AssociationType;
  readonly stp_indicator: STP;
  readonly days: ReturnType<typeof days>;
}

export function associationRow(row: Row): AssociationRow {
  return {
    id: integer(row, "id"),
    base_uid: text(row, "base_uid"),
    assoc_uid: text(row, "assoc_uid"),
    assoc_location: text(row, "assoc_location"),
    start_date: text(row, "start_date"),
    end_date: text(row, "end_date"),
    assoc_date_ind: optionalText(row, "assoc_date_ind") as DateIndicator,
    assoc_cat: optionalText(row, "assoc_cat") as AssociationType,
    stp_indicator: text(row, "stp_indicator") as STP,
    days: days(row)
  };
}

/**
 * An ALF link, with the duration in seconds the way the query returns it.
 */
export function additionalFixedLink(row: Row): FixedLinkRecord {
  return {
    mode: text(row, "mode"),
    duration: integer(row, "duration") * 60,
    origin: text(row, "origin"),
    destination: text(row, "destination"),
    start_time: text(row, "start_time"),
    end_time: text(row, "end_time"),
    start_date: optionalText(row, "start_date"),
    end_date: optionalText(row, "end_date"),
    monday: flag(row, "monday"),
    tuesday: flag(row, "tuesday"),
    wednesday: flag(row, "wednesday"),
    thursday: flag(row, "thursday"),
    friday: flag(row, "friday"),
    saturday: flag(row, "saturday"),
    sunday: flag(row, "sunday")
  };
}

/**
 * An FLF link. The query fills in the columns FLF does not carry with constants.
 */
export function fixedLink(row: Row): FixedLinkRecord {
  return {
    mode: text(row, "mode"),
    duration: integer(row, "duration") * 60,
    origin: text(row, "origin"),
    destination: text(row, "destination"),
    start_time: "00:00:00",
    end_time: "23:59:59",
    start_date: "2017-01-01",
    end_date: "2038-01-19",
    monday: 1, tuesday: 1, wednesday: 1, thursday: 1, friday: 1, saturday: 1, sunday: 1
  };
}
