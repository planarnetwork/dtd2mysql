import {describe, it, expect} from "vitest";
import {StopTimeRow} from "@gb-transit/gtfs-schema";
import {StopTimesMerger} from "./StopTimesMerger";
import {collect, stopTime} from "./Fixtures";

describe("StopTimesMerger", () => {

  it("remaps the trip and reports the stops that were called at", async () => {
    const stopTimes = collect<StopTimeRow>();
    const used = await new StopTimesMerger(stopTimes)
      .write([stopTime("t1", "s1", 1)], {t1: "42"}, {});

    expect(stopTimes.rows[0]).to.include({trip_id: "42", stop_id: "s1"});
    expect(used).to.deep.equal({s1: true});
  });

  it("calls at the station rather than the platform", async () => {
    const stopTimes = collect<StopTimeRow>();
    const used = await new StopTimesMerger(stopTimes)
      .write([stopTime("t1", "platform", 1)], {t1: "1"}, {platform: "station"});

    expect(stopTimes.rows[0].stop_id).to.equal("station");
    expect(used).to.deep.equal({station: true});
  });

  it("drops the stop times of a trip that was dropped", async () => {
    const stopTimes = collect<StopTimeRow>();
    const used = await new StopTimesMerger(stopTimes).write([stopTime("gone", "s1", 1)], {}, {});

    expect(stopTimes.rows).to.deep.equal([]);
    expect(used).to.deep.equal({});
  });

});
