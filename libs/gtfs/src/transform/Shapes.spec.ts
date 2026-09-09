import {describe, it, expect} from "vitest";
import {Temporal} from "temporal-polyfill";
import {shapes} from "./Shapes";
import {CRS, PickupDropOffType, RouteType, Stop, StopTime} from "@gb-transit/gtfs-schema";
import {Schedule} from "../model/Schedule";
import {NO_DAYS, ScheduleCalendar} from "../model/ScheduleCalendar";
import {STP} from "../model/OverlayRecord";

const call = (crs: string, sequence: number, tripId: string): StopTime => ({
  trip_id: tripId, arrival_time: "10:00:00", departure_time: "10:01:00", stop_id: crs,
  stop_sequence: sequence, stop_headsign: null, pickup_type: PickupDropOffType.Scheduled,
  drop_off_type: PickupDropOffType.Scheduled, shape_dist_traveled: null, timepoint: 1,
  platform: null, tiploc: null
});

const train = (tripId: string, calls: string[], path: CRS[] = []): Schedule => new Schedule(
  1,
  calls.map((stop, i) => call(stop, i + 1, tripId)),
  "C00001",
  "",
  new ScheduleCalendar(
    Temporal.PlainDate.from("2024-01-01"),
    Temporal.PlainDate.from("2024-02-01"),
    {...NO_DAYS, 1: 1}
  ),
  RouteType.Rail,
  "SE",
  STP.Permanent,
  true,
  false,
  path
);

const station = (crs: string, lat: number, lon: number, located = true): Stop => ({
  stop_id: `910G${crs}`, crs, tiploc: crs, stop_name: crs, stop_desc: "", stop_lat: lat,
  stop_lon: lon, located, zone_id: 1, stop_url: "", location_type: 1, parent_station: null,
  platform_code: null, stop_timezone: "Europe/London", wheelchair_boarding: 0
});

const stations = new Map<CRS, Stop>([
  ["TBW", station("TBW", 51.126, 0.263)],
  ["TON", station("TON", 51.192, 0.271)],
  ["HGR", station("HGR", 51.234, 0.219)],
  ["PAD", station("PAD", 51.517, -0.177)],
  // In the feed because something calls at it, at Null Island because the DTD
  // gave it no coordinate
  ["NOW", station("NOW", 0, 0, false)]
].map(([crs, stop]) => [crs as CRS, stop as Stop]));

describe("shapes", () => {

  it("draws a line through the stations a train touches", () => {
    const {shapes: rows, byTrip} = shapes([train("T1", ["TBW", "HGR"], ["TBW", "TON", "HGR"])], stations);
    const id = byTrip.get("T1");

    expect(rows.map(r => [r.shape_id, r.shape_pt_lat, r.shape_pt_lon, r.shape_pt_sequence])).to.deep.equal([
      [id, 51.126, 0.263, 1],
      [id, 51.192, 0.271, 2],
      [id, 51.234, 0.219, 3]
    ]);
  });

  /**
   * The whole point. A train that runs through Tonbridge without stopping is
   * drawn through Tonbridge, so its line is the route rather than a straight
   * hop over it.
   */
  it("draws through a station the train passes but does not call at", () => {
    const {shapes: rows} = shapes([train("T1", ["TBW", "HGR"], ["TBW", "TON", "HGR"])], stations);

    expect(rows.length).to.equal(3);
  });

  it("falls back to the calls where the source gave no path", () => {
    const {shapes: rows} = shapes([train("T1", ["TBW", "HGR"])], stations);

    expect(rows.map(r => r.shape_pt_sequence)).to.deep.equal([1, 2]);
  });

  /**
   * A line on the ground carries every stopping pattern that runs over it, so
   * the fast and the stopper share one shape. It is what takes the national
   * feed from 278,794 shapes to 13,722.
   */
  it("gives two trains over the same ground one shape", () => {
    const {shapes: rows, byTrip} = shapes([
      train("T1", ["TBW", "HGR"], ["TBW", "TON", "HGR"]),
      train("T2", ["TBW", "TON", "HGR"], ["TBW", "TON", "HGR"])
    ], stations);

    expect(byTrip.get("T1")).to.equal(byTrip.get("T2"));
    expect(rows.length).to.equal(3);
  });

  it("gives two trains over different ground different shapes", () => {
    const {byTrip} = shapes([
      train("T1", ["TBW", "HGR"], ["TBW", "TON", "HGR"]),
      train("T2", ["TBW", "HGR"], ["TBW", "HGR"])
    ], stations);

    expect(byTrip.get("T1")).to.not.equal(byTrip.get("T2"));
  });

  /**
   * The id has to be the same in every build, so that something outside the
   * feed can refer to a line by it. It comes from the path and nothing else -
   * not the order the trips arrived in, and not the trip.
   */
  it("names a line after the ground it covers, not the train on it", () => {
    const first = shapes([train("T1", ["TBW", "HGR"], ["TBW", "TON", "HGR"])], stations);
    const second = shapes([train("T9", ["TBW", "TON", "HGR"], ["TBW", "TON", "HGR"])], stations);

    expect(first.byTrip.get("T1")).to.equal(second.byTrip.get("T9"));
  });

  /**
   * Null Island is how `locate` says a coordinate is missing. A line drawn
   * through it would run to the Gulf of Guinea and back.
   */
  it("does not draw through a station with no coordinate", () => {
    const {shapes: rows} = shapes([train("T1", ["TBW", "HGR"], ["TBW", "NOW", "HGR"])], stations);

    expect(rows.map(r => r.shape_pt_lat)).to.deep.equal([51.126, 51.234]);
  });

  it("does not draw through a station the feed does not publish", () => {
    const {shapes: rows} = shapes([train("T1", ["TBW", "HGR"], ["TBW", "ZUX", "HGR"])], stations);

    expect(rows.length).to.equal(2);
  });

  it("names a station once where dropping one puts it beside itself", () => {
    const {shapes: rows} = shapes([train("T1", ["TBW", "HGR"], ["TBW", "ZUX", "TBW", "HGR"])], stations);

    expect(rows.map(r => r.shape_pt_lat)).to.deep.equal([51.126, 51.234]);
  });

  it("gives no shape to a trip with nowhere it can be drawn", () => {
    const {shapes: rows, byTrip} = shapes([train("T1", ["NOW", "ZUX"], ["NOW", "ZUX"])], stations);

    expect(rows).to.deep.equal([]);
    expect(byTrip.has("T1")).to.equal(false);
  });

  /**
   * Six decimal places is eleven centimetres, and the line between two stations
   * is wrong by kilometres wherever the track bends. Seventeen digits of it are
   * a megabyte of feed saying nothing.
   */
  it("rounds a coordinate to six places", () => {
    const long = new Map<CRS, Stop>([
      ["AAA", station("AAA", 52.24265178986467, -4.258423995105473)],
      ["BBB", station("BBB", 51.5, -0.1)]
    ]);
    const {shapes: rows} = shapes([train("T1", ["AAA", "BBB"])], long);

    expect(rows[0].shape_pt_lat).to.equal(52.242652);
    expect(rows[0].shape_pt_lon).to.equal(-4.258424);
  });

  /**
   * GTFS reads a distance along the shape only where stop_times.txt carries one
   * too, and putting one on all 2.9 million calls is not worth what it buys.
   */
  it("writes no distance along the shape", () => {
    const {shapes: rows} = shapes([train("T1", ["TBW", "HGR"])], stations);

    expect(rows.every(r => r.shape_dist_traveled === null)).to.equal(true);
  });

  it("ignores a schedule with no stop times at all", () => {
    expect(shapes([train("T1", [])], stations).shapes).to.deep.equal([]);
  });

});
