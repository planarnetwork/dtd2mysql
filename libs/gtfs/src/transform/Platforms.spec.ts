import {describe, it, expect} from "vitest";
import {stopId, withStopPoints} from "./Platforms";
import {Stop} from "../entity/Stop";
import {StopTime} from "../entity/StopTime";
import {Schedule} from "../model/Schedule";

const stop = (crs: string, tiploc: string): Stop => ({
  stop_id: `910G${tiploc}`, crs, tiploc, stop_name: crs, stop_desc: "", stop_lat: 51, stop_lon: -1,
  zone_id: 0, stop_url: "", location_type: 0, parent_station: null, platform_code: null,
  stop_timezone: "Europe/London", wheelchair_boarding: 0, located: true
});

const call = (crs: string, platform: string | null, tiploc: string | null = null): StopTime => ({
  trip_id: "T", arrival_time: "10:00:00", departure_time: "10:00:00", stop_id: crs,
  stop_sequence: 1, stop_headsign: null, pickup_type: 0, drop_off_type: 0,
  shape_dist_traveled: null, timepoint: 1, platform, tiploc
});

const train = (...calls: StopTime[]) => ({stopTimes: calls}) as Schedule;

const paddington = stop("PAD", "PADTON");

describe("withStopPoints", () => {

  it("puts a boarding point under the station for every platform called at", () => {
    const stops = withStopPoints([paddington], [train(call("PAD", "1"), call("PAD", "A"))]);

    expect(stops.map(s => [s.stop_id, s.location_type, s.parent_station, s.platform_code])).to.deep.equal([
      ["910GPADTON", 1, null, null],
      ["9100PADTON1", 0, "910GPADTON", "1"],
      ["9100PADTONA", 0, "910GPADTON", "A"]
    ]);
  });

  it("gives a call that names no platform a boarding point of its own", () => {
    // The station is location_type=1, so the call cannot reference it. Without
    // this stop a station where one call names no platform could publish none of
    // its platforms.
    const stops = withStopPoints([paddington], [train(call("PAD", "1"), call("PAD", null))]);

    expect(stops.map(s => s.stop_id)).to.deep.equal(["910GPADTON", "9100PADTON1", "9100PADTON"]);
  });

  it("treats a running line as no platform", () => {
    // DF is Down Fast: which track the train takes, not somewhere to stand.
    const stops = withStopPoints([paddington], [train(call("PAD", "DF"))]);

    expect(stops.map(s => [s.stop_id, s.platform_code])).to.deep.equal([
      ["910GPADTON", null],
      ["9100PADTON", null]
    ]);
  });

  it("takes the TIPLOC of the timing point rather than the station's", () => {
    const clapham = stop("CLJ", "CLPHMJC");
    const stops = withStopPoints([clapham], [train(call("CLJ", "3", "CLPHMJW"), call("CLJ", "15", "CLPHMJC"))]);

    expect(stops.map(s => s.stop_id)).to.deep.equal(["910GCLPHMJC", "9100CLPHMJW3", "9100CLPHMJC15"]);
    expect(stops.every(s => s.parent_station === null || s.parent_station === "910GCLPHMJC")).to.equal(true);
  });

  it("names the platform in the child's name, and leaves the station's alone", () => {
    const named = {...paddington, stop_name: "London Paddington"};
    const stops = withStopPoints([named], [train(call("PAD", "12"), call("PAD", null))]);

    expect(stops.map(s => s.stop_name)).to.deep.equal([
      "London Paddington",
      "London Paddington Platform 12",
      "London Paddington"
    ]);
  });

  it("makes every station a parent, whether or not anything calls at it", () => {
    const stops = withStopPoints([paddington], []);

    expect(stops.map(s => [s.stop_id, s.location_type])).to.deep.equal([["910GPADTON", 1]]);
  });

  it("ignores a call at a station the feed does not describe", () => {
    const stops = withStopPoints([paddington], [train(call("ZUX", "1"))]);

    expect(stops.map(s => s.stop_id)).to.deep.equal(["910GPADTON"]);
  });

});

describe("stopId", () => {

  const tiplocs = new Map([["PAD", "PADTON"]]);

  it("writes a call against the boarding point its platform is", () => {
    expect(stopId(call("PAD", "A", "PADTON"), tiplocs)).to.equal("9100PADTONA");
  });

  it("writes a call that names no platform against the station's boarding point", () => {
    expect(stopId(call("PAD", null, "PADTON"), tiplocs)).to.equal("9100PADTON");
    expect(stopId(call("PAD", "DPL", "PADTON"), tiplocs)).to.equal("9100PADTON");
  });

  it("falls back to the station's TIPLOC where the source gave none", () => {
    // A z-train's location is a CRS code, so its calls arrive without one.
    expect(stopId(call("PAD", "1"), tiplocs)).to.equal("9100PADTON1");
  });

});
