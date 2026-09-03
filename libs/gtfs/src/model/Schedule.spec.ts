import {describe, expect, it} from 'vitest';
import {STP} from "../model/OverlayRecord";
import {Days, ScheduleCalendar} from "../model/ScheduleCalendar";
import {schedule} from "../transform/MergeSchedules.spec";
import {StopTime} from "../entity/StopTime";
import {Schedule} from "./Schedule";
import {RouteType} from "../entity/Route";
import {AgencyID} from "../entity/Agency";
import {CRS} from "../entity/Stop";

describe("Schedule", () => {

  it("does not share stop times with its clones", () => {
    const original = schedule(1, "A", "2017-01-01", "2017-01-31", STP.Permanent, ALL_DAYS, [
      stop("AAA", "00:30")
    ]);

    const clone = original.clone(original.calendar.shiftBackward(), 2);
    clone.stopTimes[0].departure_time = "24:30";

    expect(original.stopTimes[0].departure_time).to.equal("00:30");
  });

  it("identifies a trip by TUID, STP indicator and date range", () => {
    const permanent = schedule(1, "A", "2017-01-01", "2017-01-31", STP.Permanent);
    const overlay = schedule(2, "A", "2017-01-01", "2017-01-31", STP.Overlay);

    expect(permanent.tripId).to.equal("A_20170101_20170131");
    expect(overlay.tripId).to.equal("A_20170101_20170131");
  });

});

describe("the route a schedule runs on", () => {

  it("is the operator, for one that runs a single brand", () => {
    expect(service("GW", ["PNZ", "PAD"]).routeId).to.equal("GW");
  });

  it("is the line, for an operator that runs several", () => {
    // Richmond to Stratford is the Mildmay line, and only that.
    expect(service("LO", ["RMD", "SRA"]).routeId).to.equal("MIL");
    // Rickmansworth to Baker Street is the Metropolitan, Richmond to Turnham
    // Green the District.
    expect(service("LT", ["RIC", "ZBS"]).routeId).to.equal("MET");
    expect(service("LT", ["RMD", "ZTU"]).routeId).to.equal("DST");
  });

  it("takes the first line whose stations it reaches", () => {
    // A service reaching two lines' stations - Watford Junction is Lioness and
    // Stratford is Mildmay - takes whichever rule is written first.
    expect(service("LO", ["WFJ", "SBP", "SRA"]).routeId).to.equal("LIO");
  });

  it("tells the West Midlands Trains brands apart by where the service ends", () => {
    expect(service("LM", ["BHM", "EUS"]).routeId).to.equal("LN");
    expect(service("LM", ["BHM", "SHR"]).routeId).to.equal("WM");
  });

  it("is the Stansted Express only when the airport service runs to London", () => {
    expect(service("LE", ["SSD", "TOM", "LST"]).routeId).to.equal("SX");
    expect(service("LE", ["SSD", "CBG"]).routeId).to.equal("LE");
  });

  it("separates a bus and a replacement bus from the trains", () => {
    expect(service("GW", ["PNZ", "PAD"], RouteType.Bus).routeId).to.equal("GW_BUS");
    expect(service("GW", ["PNZ", "PAD"], RouteType.ReplacementBus).routeId).to.equal("GW_RRB");
  });

  it("is the same route however the schedule reached it", () => {
    const east = service("LO", ["SRA", "KNR", "RMD"]);
    const west = service("LO", ["RMD", "KNR", "SRA"]);

    expect(east.routeId).to.equal(west.routeId);
    expect(east.toRoute()).to.deep.equal(west.toRoute());
  });

});

describe("a schedule as a GTFS route", () => {

  it("is named as the brand names itself", () => {
    expect(service("GW", ["PNZ", "PAD"]).toRoute()).to.contain({
      route_id: "GW",
      agency_id: "GW",
      route_short_name: "GWR",
      route_long_name: "Great Western Railway",
      route_url: null
    });
  });

  it("takes its name from the agency, for an operator with no brand entry", () => {
    expect(service("QC", ["LAR"], RouteType.Ferry)).to.satisfy((s: Schedule) => {
      const route = s.toRoute();

      return route.route_short_name === null && route.route_long_name === "Caledonian MacBrayne";
    });
  });

  it("falls back to the route id for an operator it has never heard of", () => {
    expect(service("QQ", ["TON", "SEV"]).toRoute()).to.contain({
      route_id: "QQ",
      // Not an agency, so not one that can be published as one.
      agency_id: "ZZ",
      route_short_name: "QQ",
      route_long_name: null
    });
  });

  it("writes text that can be read on the colour it is drawn in", () => {
    // The Northern line's blue takes white text.
    expect(service("ME", ["HNX", "SDL"]).toRoute()).to.contain({
      route_color: "0266b2",
      route_text_color: "FFFFFF"
    });
    // A Merseyrail service whose calls name no line keeps the operator's own
    // colour, which is a yellow that takes black text.
    expect(service("ME", ["LVC", "LIV"]).toRoute()).to.contain({
      route_color: "fff200",
      route_text_color: "000000"
    });
  });

  it("says nothing about a route it has no colour for", () => {
    expect(service("TW", ["MTS", "SBN"]).toRoute()).to.contain({
      route_color: null,
      route_text_color: null
    });
  });

});

const ALL_DAYS: Days = { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 };

/**
 * A schedule that is only the things a route is worked out from: who runs it,
 * how, and where it calls.
 */
function service(operator: AgencyID, calls: CRS[], mode: RouteType = RouteType.Rail): Schedule {
  return new Schedule(
    1,
    calls.map((crs, i) => ({...stop(crs, "00:30"), stop_sequence: i + 1})),
    "A",
    "",
    new ScheduleCalendar(
      Temporal.PlainDate.from("2017-01-01"),
      Temporal.PlainDate.from("2017-01-31"),
      ALL_DAYS,
      {}
    ),
    mode,
    operator,
    STP.Permanent,
    false,
    false
  );
}

function stop(stopId: string, time: string): StopTime {
  return {
    trip_id: "A_20170101_20170131",
    arrival_time: time,
    departure_time: time,
    stop_id: stopId,
    stop_sequence: 1,
    stop_headsign: null,
    pickup_type: 0,
    drop_off_type: 0,
    shape_dist_traveled: null,
    timepoint: 0,
    platform: null,
    tiploc: null,
  };
}
