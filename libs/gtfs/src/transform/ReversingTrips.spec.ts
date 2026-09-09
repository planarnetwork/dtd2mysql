import {describe, it, expect} from "vitest";
import {Temporal} from "temporal-polyfill";
import {AgencyID, CRS, PickupDropOffType, RouteType, StopTime, TIPLOC} from "@gb-transit/gtfs-schema";
import {Days, NO_DAYS, ScheduleCalendar} from "../model/ScheduleCalendar";
import {STP} from "../model/OverlayRecord";
import {Schedule, tripId} from "../model/Schedule";
import {AssociationType} from "../model/Association";
import {TripLink} from "./LinkedTrips";
import {reversingTrips} from "./ReversingTrips";

describe("reversingTrips", () => {

  it("couples a train arriving via Wimbledon with one leaving for Hackbridge", () => {
    const arrives = schedule(1, "A", ["WIM", {at: "SUO", time: "10:00:00", platform: "4"}]);
    const departs = schedule(2, "B", [{at: "SUO", time: "10:02:00", platform: "4"}, "HCB"]);
    const [row] = reversingTrips([arrives, departs], [], tiplocs);

    expect(row.from_stop_id).to.equal("9100SUTTON4");
    expect(row.to_stop_id).to.equal("9100SUTTON4");
    expect(row.from_trip_id).to.equal("A_20240101_20240201");
    expect(row.to_trip_id).to.equal("B_20240101_20240201");
    expect(row.transfer_type).to.equal(4);
  });

  it("couples the mirror direction, arriving via Hackbridge and leaving for Wimbledon", () => {
    const arrives = schedule(1, "A", ["HCB", {at: "SUO", time: "10:00:00", platform: "2"}]);
    const departs = schedule(2, "B", [{at: "SUO", time: "10:02:00", platform: "2"}, "WIM"]);
    const [row] = reversingTrips([arrives, departs], [], tiplocs);

    expect(row.from_stop_id).to.equal("9100SUTTON2");
    expect(row.to_trip_id).to.equal("B_20240101_20240201");
  });

  it("leaves a pair alone where the platforms differ", () => {
    const arrives = schedule(1, "A", ["WIM", {at: "SUO", time: "10:00:00", platform: "4"}]);
    const departs = schedule(2, "B", [{at: "SUO", time: "10:02:00", platform: "3"}, "HCB"]);

    expect(reversingTrips([arrives, departs], [], tiplocs)).to.deep.equal([]);
  });

  it("leaves a pair alone where either call names no platform", () => {
    const arrives = schedule(1, "A", ["WIM", {at: "SUO", time: "10:00:00", platform: "4"}]);
    const departs = schedule(2, "B", [{at: "SUO", time: "10:02:00"}, "HCB"]);

    expect(reversingTrips([arrives, departs], [], tiplocs)).to.deep.equal([]);
  });

  it("leaves a pair alone where both calls name the same running line", () => {
    // a passenger cannot sit on a running line, so two trains on one are not two trains in a place
    const arrives = schedule(1, "A", ["WIM", {at: "SUO", time: "10:00:00", platform: "DF"}]);
    const departs = schedule(2, "B", [{at: "SUO", time: "10:02:00", platform: "DF"}, "HCB"]);

    expect(reversingTrips([arrives, departs], [], tiplocs)).to.deep.equal([]);
  });

  it("couples a turnaround of exactly a minute and of exactly ten", () => {
    const arrives = schedule(1, "A", ["WIM", {at: "SUO", time: "10:00:00", platform: "4"}]);

    expect(reversingTrips([arrives, leaving("10:01:00")], [], tiplocs).length).to.equal(1);
    expect(reversingTrips([arrives, leaving("10:10:00")], [], tiplocs).length).to.equal(1);
  });

  it("leaves alone a train leaving at the moment one arrives, and one leaving eleven minutes later", () => {
    const arrives = schedule(1, "A", ["WIM", {at: "SUO", time: "10:00:00", platform: "4"}]);

    expect(reversingTrips([arrives, leaving("10:00:00")], [], tiplocs)).to.deep.equal([]);
    expect(reversingTrips([arrives, leaving("10:11:00")], [], tiplocs)).to.deep.equal([]);
  });

  it("couples a turnback told across midnight, which the feed tells in one service day", () => {
    const arrives = schedule(1, "A", ["WIM", {at: "SUO", time: "23:58:00", platform: "4"}]);
    const departs = schedule(2, "B", [{at: "SUO", time: "24:01:00", platform: "4"}, "HCB"]);

    expect(reversingTrips([arrives, departs], [], tiplocs).length).to.equal(1);
  });

  it("leaves a pair alone that never runs on the same day", () => {
    const arrives = schedule(1, "A", ["WIM", {at: "SUO", time: "10:00:00", platform: "4"}]);
    const departs = schedule(2, "B", [{at: "SUO", time: "10:02:00", platform: "4"}, "HCB"], {
      calendar: calendar("2024-01-01", "2024-02-01", {...NO_DAYS, 2: 1})
    });

    expect(reversingTrips([arrives, departs], [], tiplocs)).to.deep.equal([]);
  });

  it("leaves a pair alone whose date ranges do not meet", () => {
    const arrives = schedule(1, "A", ["WIM", {at: "SUO", time: "10:00:00", platform: "4"}]);
    const departs = schedule(2, "B", [{at: "SUO", time: "10:02:00", platform: "4"}, "HCB"], {
      calendar: calendar("2024-03-01", "2024-04-01", MONDAYS)
    });

    expect(reversingTrips([arrives, departs], [], tiplocs)).to.deep.equal([]);
  });

  it("leaves a pair alone where either train is not the operator the rule names", () => {
    const arrives = schedule(1, "A", ["WIM", {at: "SUO", time: "10:00:00", platform: "4"}]);
    const southern = schedule(2, "B", [{at: "SUO", time: "10:02:00", platform: "4"}, "HCB"], {operator: "SN"});

    expect(reversingTrips([arrives, southern], [], tiplocs)).to.deep.equal([]);
  });

  it("leaves a pair alone where the arriving train comes in on neither arm", () => {
    const arrives = schedule(1, "A", ["EPS", {at: "SUO", time: "10:00:00", platform: "4"}]);
    const departs = schedule(2, "B", [{at: "SUO", time: "10:02:00", platform: "4"}, "HCB"]);

    expect(reversingTrips([arrives, departs], [], tiplocs)).to.deep.equal([]);
  });

  it("leaves a pair alone where the first train passes through rather than terminating", () => {
    const passes = schedule(1, "A", ["WIM", {at: "SUO", time: "10:00:00", platform: "4"}, "EPS"]);
    const departs = schedule(2, "B", [{at: "SUO", time: "10:02:00", platform: "4"}, "HCB"]);

    expect(reversingTrips([passes, departs], [], tiplocs)).to.deep.equal([]);
  });

  it("stays out of a pair an association already couples", () => {
    const arrives = schedule(1, "A", ["WIM", {at: "SUO", time: "10:00:00", platform: "4"}]);
    const departs = schedule(2, "B", [{at: "SUO", time: "10:02:00", platform: "4"}, "HCB"]);
    const coupled: TripLink[] = [
      {from: "A_20240101_20240201", to: "B_20240101_20240201", location: "SUO", type: AssociationType.Split}
    ];

    expect(reversingTrips([arrives, departs], coupled, tiplocs)).to.deep.equal([]);
  });

  it("writes one row for a pair both directions' rules match", () => {
    const arrives = schedule(1, "A", ["HCB", "WIM", {at: "SUO", time: "10:00:00", platform: "4"}]);
    const departs = schedule(2, "B", [{at: "SUO", time: "10:02:00", platform: "4"}, "HCB", "WIM"]);

    expect(reversingTrips([arrives, departs], [], tiplocs).length).to.equal(1);
  });

  it("ignores a schedule with one call, which is no trip to name", () => {
    const arrives = schedule(1, "A", [{at: "SUO", time: "10:00:00", platform: "4"}]);
    const departs = schedule(2, "B", [{at: "SUO", time: "10:02:00", platform: "4"}, "HCB"]);

    expect(reversingTrips([arrives, departs], [], tiplocs)).to.deep.equal([]);
  });

  it("carries no calendar and no transfer time, because the trips say both", () => {
    const arrives = schedule(1, "A", ["WIM", {at: "SUO", time: "10:00:00", platform: "4"}]);
    const [row] = reversingTrips([arrives, leaving("10:02:00")], [], tiplocs);

    expect(row.min_transfer_time).to.equal(null);
    expect(row.start_date).to.equal(null);
    expect(row.end_date).to.equal(null);
    expect(row.monday).to.equal(null);
    expect(row.mode).to.equal(null);
  });

  it("reads the call a train ends on where it calls at the terminus twice", () => {
    const arrives = schedule(1, "A", [
      "WIM",
      {at: "SUO", time: "09:50:00", platform: "1"},
      "MIJ",
      {at: "SUO", time: "10:00:00", platform: "4"}
    ]);
    const [row] = reversingTrips([arrives, leaving("10:02:00")], [], tiplocs);

    expect(row.from_stop_id).to.equal("9100SUTTON4");
  });

});

const MONDAYS: Days = {...NO_DAYS, 1: 1};

const tiplocs: ReadonlyMap<CRS, TIPLOC> = new Map([
  ["SUO", "SUTTON"], ["WIM", "WIMBLDN"], ["HCB", "HACKBDG"], ["MIJ", "MITCHJ"], ["EPS", "EPSOM"]
]);

/** A train leaving Sutton for Hackbridge off platform 4, which is what most of these pair with. */
function leaving(time: string): Schedule {
  return schedule(2, "B", [{at: "SUO", time, platform: "4"}, "HCB"]);
}

interface Options {
  operator?: AgencyID;
  calendar?: ScheduleCalendar;
}

type Call = CRS | {at: CRS, time?: string, platform?: string | null};

function schedule(id: number, tuid: string, calls: Call[], options: Options = {}): Schedule {
  const days = options.calendar ?? calendar("2024-01-01", "2024-02-01", MONDAYS);
  const trip = tripId(tuid, days);

  return new Schedule(
    id,
    calls.map((call, i) => stopTime(call, trip, i + 1)),
    tuid,
    "",
    days,
    RouteType.Rail,
    options.operator ?? "TL",
    STP.Permanent,
    false,
    false
  );
}

function calendar(from: string, to: string, days: Days): ScheduleCalendar {
  return new ScheduleCalendar(Temporal.PlainDate.from(from), Temporal.PlainDate.from(to), days);
}

function stopTime(call: Call, trip: string, sequence: number): StopTime {
  const {at, time, platform} = typeof call === "string"
    ? {at: call, time: "10:00:00", platform: null}
    : {time: "10:00:00", platform: null, ...call};

  return {
    trip_id: trip,
    arrival_time: time,
    departure_time: time,
    stop_id: at,
    stop_sequence: sequence,
    stop_headsign: null,
    pickup_type: PickupDropOffType.Scheduled,
    drop_off_type: PickupDropOffType.Scheduled,
    shape_dist_traveled: null,
    timepoint: 1,
    platform,
    tiploc: null
  };
}
