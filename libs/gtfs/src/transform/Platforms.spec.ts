import {describe, it, expect} from "vitest";
import {stopId, withPlatforms} from "./Platforms";
import {Stop} from "../entity/Stop";
import {StopTime} from "../entity/StopTime";
import {Schedule} from "../model/Schedule";

const stop = (id: string): Stop => ({
  stop_id: id, stop_code: id, stop_name: id, stop_desc: "", stop_lat: 51, stop_lon: -1,
  zone_id: 0, stop_url: "", location_type: 0, parent_station: null, platform_code: null,
  stop_timezone: "Europe/London", wheelchair_boarding: 0
});

const call = (id: string, platform: string | null): StopTime => ({
  trip_id: "T", arrival_time: "10:00:00", departure_time: "10:00:00", stop_id: id,
  stop_sequence: 1, stop_headsign: null, pickup_type: 0, drop_off_type: 0,
  shape_dist_traveled: null, timepoint: 1, platform
});

const train = (...calls: StopTime[]) => ({stopTimes: calls}) as Schedule;

describe("withPlatforms", () => {

  it("splits a station every call names a platform at", () => {
    const {stops, split} = withPlatforms([stop("PAD")], [train(call("PAD", "1"), call("PAD", "A"))]);

    expect(split.has("PAD")).to.equal(true);
    expect(stops.map(s => [s.stop_id, s.location_type, s.parent_station, s.platform_code])).to.deep.equal([
      ["PAD", 1, null, null],
      ["PAD_1", 0, "PAD", "1"],
      ["PAD_A", 0, "PAD", "A"]
    ]);
  });

  it("leaves a station whole when a call names no platform", () => {
    // Splitting it would make the station location_type=1, and the call with no
    // platform would then be a stop time against a station, which is an error.
    const {stops, split} = withPlatforms([stop("PAD")], [train(call("PAD", "1"), call("PAD", null))]);

    expect(split.has("PAD")).to.equal(false);
    expect(stops.map(s => s.stop_id)).to.deep.equal(["PAD"]);
  });

  it("leaves a station whole when a call names a running line", () => {
    // DF is Down Fast: which track the train takes, not somewhere to stand.
    const {split} = withPlatforms([stop("PAD")], [train(call("PAD", "1"), call("PAD", "DF"))]);

    expect(split.has("PAD")).to.equal(false);
  });

  it("names the platform in the child's name", () => {
    const paddington = {...stop("PAD"), stop_name: "London Paddington"};
    const {stops} = withPlatforms([paddington], [train(call("PAD", "12"))]);

    expect(stops[1].stop_name).to.equal("London Paddington Platform 12");
  });

});

describe("stopId", () => {

  it("writes a call at a split station against its platform", () => {
    expect(stopId(call("PAD", "A"), new Set(["PAD"]))).to.equal("PAD_A");
  });

  it("writes a call at a station left whole against the station", () => {
    expect(stopId(call("PAD", "A"), new Set())).to.equal("PAD");
    expect(stopId(call("PAD", null), new Set())).to.equal("PAD");
  });

});
