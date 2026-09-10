import {describe, it, expect} from "vitest";
import {StopTimeRow} from "@gb-transit/gtfs-schema";
import {StopTimesMerger, StopTimesPass} from "./StopTimesMerger";
import {TripIDMap} from "./TripsMerger";
import {collect, stopTime} from "./Fixtures";

/**
 * Feed the pass the rows of one chunk the way the reader does - the same row
 * object reused throughout - and then let it write them.
 */
async function chunk(pass: StopTimesPass, rows: StopTimeRow[]): Promise<void> {
  const reused = {} as StopTimeRow;

  for (const row of rows) {
    pass.row(Object.assign(reused, row));
  }

  await pass.flush();
}

function merging(tripIdMap: TripIDMap) {
  const stopTimes = collect<StopTimeRow>();
  const merger = new StopTimesMerger(stopTimes);

  return {stopTimes, pass: merger.begin(tripIdMap)};
}

describe("StopTimesMerger", () => {

  it("remaps the trip and reports the stops that were called at", async () => {
    const {stopTimes, pass} = merging({t1: "42"});

    await chunk(pass, [stopTime("t1", "s1", 1)]);

    expect(stopTimes.rows[0]).to.include({trip_id: "42", stop_id: "s1"});
    expect(pass.usedStops).to.deep.equal({s1: true});
  });

  /**
   * The platform, not the station above it: which platform is what the feed
   * said, and the station is still reachable through parent_station.
   */
  it("calls where the feed said it calls", async () => {
    const {stopTimes, pass} = merging({t1: "1"});

    await chunk(pass, [stopTime("t1", "platform", 1)]);

    expect(stopTimes.rows[0].stop_id).to.equal("platform");
    expect(pass.usedStops).to.deep.equal({platform: true});
  });

  it("drops the stop times of a trip that was dropped", async () => {
    const {stopTimes, pass} = merging({});

    await chunk(pass, [stopTime("gone", "s1", 1)]);

    expect(stopTimes.rows).to.deep.equal([]);
    expect(pass.usedStops).to.deep.equal({});
  });

  /**
   * The reader hands back the same object for every row, so a call held past the
   * one after it is the one after it.
   */
  it("keeps each call as it was when it arrived", async () => {
    const {stopTimes, pass} = merging({t1: "1"});

    await chunk(pass, [stopTime("t1", "s1", 1), stopTime("t1", "s2", 2), stopTime("t1", "s3", 3)]);

    expect(stopTimes.rows.map(row => row.stop_id)).to.deep.equal(["s1", "s2", "s3"]);
    expect(stopTimes.rows.map(row => row.stop_sequence)).to.deep.equal([1, 2, 3]);
  });

  it("writes the calls of every chunk, in order", async () => {
    const {stopTimes, pass} = merging({t1: "1", t2: "2"});

    await chunk(pass, [stopTime("t1", "s1", 1), stopTime("t1", "s2", 2)]);
    await chunk(pass, [stopTime("t2", "s3", 1)]);
    await chunk(pass, [stopTime("t2", "s4", 2)]);

    expect(stopTimes.rows.map(row => row.stop_id)).to.deep.equal(["s1", "s2", "s3", "s4"]);
    expect(stopTimes.rows.map(row => row.trip_id)).to.deep.equal(["1", "1", "2", "2"]);
  });

  /**
   * A writer whose buffer is full is waited on, and it is waited on when the
   * reader pauses rather than between one row and the next.
   */
  it("waits for a full writer when the chunk is written", async () => {
    const {stopTimes, pass} = merging({t1: "1"});
    let drained = 0;

    stopTimes.write = row => {
      stopTimes.rows.push({...row});

      return false;
    };

    stopTimes.drain = async () => { drained++; };

    pass.row(stopTime("t1", "s1", 1));
    pass.row(stopTime("t1", "s2", 2));

    expect(stopTimes.rows.length).to.equal(0);

    await pass.flush();

    expect(stopTimes.rows.length).to.equal(2);
    expect(drained).to.equal(2);
  });

});
