import {describe, it, expect} from "vitest";
import {StopTimeRow} from "@gb-transit/gtfs-schema";
import {StopTimeReader, StopTimesMerger} from "./StopTimesMerger";
import {collect, stopTime} from "./Fixtures";

/**
 * The rows of a feed, offered the way the reader offers them: one chunk at a
 * time, the same row object reused throughout, and a pause between chunks.
 */
function reading(chunks: StopTimeRow[][]): StopTimeReader {
  return async (onRow, betweenChunks) => {
    const reused = {} as StopTimeRow;

    for (const chunk of chunks) {
      for (const row of chunk) {
        onRow(Object.assign(reused, row));
      }

      await betweenChunks();
    }
  };
}

const asRows = (rows: StopTimeRow[]): StopTimeReader => reading([rows]);

describe("StopTimesMerger", () => {

  it("remaps the trip and reports the stops that were called at", async () => {
    const stopTimes = collect<StopTimeRow>();
    const used = await new StopTimesMerger(stopTimes)
      .write(asRows([stopTime("t1", "s1", 1)]), {t1: "42"}, {});

    expect(stopTimes.rows[0]).to.include({trip_id: "42", stop_id: "s1"});
    expect(used).to.deep.equal({s1: true});
  });

  it("calls at the station rather than the platform", async () => {
    const stopTimes = collect<StopTimeRow>();
    const used = await new StopTimesMerger(stopTimes)
      .write(asRows([stopTime("t1", "platform", 1)]), {t1: "1"}, {platform: "station"});

    expect(stopTimes.rows[0].stop_id).to.equal("station");
    expect(used).to.deep.equal({station: true});
  });

  it("drops the stop times of a trip that was dropped", async () => {
    const stopTimes = collect<StopTimeRow>();
    const used = await new StopTimesMerger(stopTimes)
      .write(asRows([stopTime("gone", "s1", 1)]), {}, {});

    expect(stopTimes.rows).to.deep.equal([]);
    expect(used).to.deep.equal({});
  });

  /**
   * The reader hands back the same object for every row, so a call held past the
   * one after it is the one after it.
   */
  it("keeps each call as it was when it arrived", async () => {
    const stopTimes = collect<StopTimeRow>();

    await new StopTimesMerger(stopTimes).write(
      asRows([stopTime("t1", "s1", 1), stopTime("t1", "s2", 2), stopTime("t1", "s3", 3)]),
      {t1: "1"},
      {}
    );

    expect(stopTimes.rows.map(row => row.stop_id)).to.deep.equal(["s1", "s2", "s3"]);
    expect(stopTimes.rows.map(row => row.stop_sequence)).to.deep.equal([1, 2, 3]);
  });

  /**
   * The last rows of a file arrive after its last chunk, as the inflater and the
   * parser give up what they were holding, so a merger that only wrote when the
   * reader paused would lose the end of every feed.
   */
  it("writes the calls that arrive after the last pause", async () => {
    const stopTimes = collect<StopTimeRow>();

    await new StopTimesMerger(stopTimes).write(
      async (onRow, betweenChunks) => {
        onRow(stopTime("t1", "s1", 1));

        await betweenChunks();

        onRow(stopTime("t1", "s2", 2));
      },
      {t1: "1"},
      {}
    );

    expect(stopTimes.rows.map(row => row.stop_id)).to.deep.equal(["s1", "s2"]);
  });

  it("writes the calls of every chunk, in order", async () => {
    const stopTimes = collect<StopTimeRow>();

    await new StopTimesMerger(stopTimes).write(
      reading([
        [stopTime("t1", "s1", 1), stopTime("t1", "s2", 2)],
        [stopTime("t2", "s3", 1)],
        [stopTime("t2", "s4", 2)]
      ]),
      {t1: "1", t2: "2"},
      {}
    );

    expect(stopTimes.rows.map(row => row.stop_id)).to.deep.equal(["s1", "s2", "s3", "s4"]);
    expect(stopTimes.rows.map(row => row.trip_id)).to.deep.equal(["1", "1", "2", "2"]);
  });

  /**
   * A writer whose buffer is full is waited on, and it is waited on between
   * chunks rather than between rows.
   */
  it("waits for a full writer before reading on", async () => {
    const stopTimes = collect<StopTimeRow>();
    let draining = false;
    let drained = 0;

    stopTimes.write = row => {
      stopTimes.rows.push({...row});

      return false;
    };

    stopTimes.drain = async () => {
      draining = true;
      drained++;

      await Promise.resolve();

      draining = false;
    };

    await new StopTimesMerger(stopTimes).write(
      async (onRow, betweenChunks) => {
        onRow(stopTime("t1", "s1", 1));

        await betweenChunks();

        expect(draining).to.equal(false);

        onRow(stopTime("t1", "s2", 2));
      },
      {t1: "1"},
      {}
    );

    expect(drained).to.equal(2);
    expect(stopTimes.rows.length).to.equal(2);
  });

});
