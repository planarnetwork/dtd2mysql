import {describe, it, expect} from "vitest";
import {FrequencyRow} from "@gb-transit/gtfs-schema";
import {FrequenciesMerger} from "./FrequenciesMerger";
import {collect} from "./Fixtures";

const every = (trip: string, seconds: number): FrequencyRow => ({
  trip_id: trip, start_time: "06:00:00", end_time: "20:00:00", headway_secs: seconds,
  exact_times: 0
});

describe("FrequenciesMerger", () => {

  it("points a row at the trip's new id", async () => {
    const frequencies = collect<FrequencyRow>();

    await new FrequenciesMerger(frequencies).write([every("t1", 720)], {t1: "42"});

    expect(frequencies.rows[0]).to.include({trip_id: "42", headway_secs: 720});
  });

  it("drops a row whose trip was dropped", async () => {
    const frequencies = collect<FrequencyRow>();

    await new FrequenciesMerger(frequencies).write([every("gone", 720)], {});

    expect(frequencies.rows).to.deep.equal([]);
  });

});
