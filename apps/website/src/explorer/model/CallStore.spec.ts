import {describe, it, expect} from "vitest";
import {CallIndex, CallStore, NO_TIME, callStoreSink} from "./CallStore.js";

function read(chunks: string[], originalSize?: number): CallStore {
  let store: CallStore | undefined;
  const sink = callStoreSink(built => store = built, originalSize);

  chunks.forEach((chunk, index) => sink(chunk, index === chunks.length - 1));

  return store as CallStore;
}

const HEADER = "trip_id,arrival_time,departure_time,stop_id,stop_sequence,pickup_type,drop_off_type,timepoint\n";

describe("CallStore", () => {

  it("keeps every call distinct", () => {
    // CSVParser hands the same row object back every time. A store that kept a reference rather than
    // reading the fields out would end up with the last call repeated all the way down.
    const rows = Array.from({length: 1326},
      (_, i) => `TRIP${i % 128},10:00:00,10:01:00,STOP${i},${(i % 41) + 1},0,0,1`).join("\n");
    const store = read([HEADER + rows + "\n"]);

    expect(store.rows).to.equal(1326);
    expect(store.stopId(0)).to.equal("STOP0");
    expect(store.stopId(1325)).to.equal("STOP1325");
    expect(new Set(Array.from({length: 1326}, (_, i) => store.stopId(i))).size).to.equal(1326);
  });

  it("reads a time as seconds from the start of the service day", () => {
    const store = read([HEADER + "T1,00:10:00,00:11:30,S1,1,0,0,1\n"]);

    expect(store.arrival[0]).to.equal(600);
    expect(store.departure[0]).to.equal(690);
  });

  it("reads a time past midnight as past midnight, not as the small hours", () => {
    // 24:35 has to sort after 23:50, which is the whole reason a GTFS time is not a clock time.
    const store = read([HEADER + "T1,24:35:00,24:36:00,S1,1,0,0,1\n"]);

    expect(store.arrival[0]).to.equal(88500);
    expect(store.arrival[0]).to.be.greaterThan(23 * 3600 + 50 * 60);
  });

  it("leaves an empty time absent rather than at midnight", () => {
    const store = read([HEADER + "T1,,10:01:00,S1,1,0,0,1\n"]);

    expect(store.arrival[0]).to.equal(NO_TIME);
    expect(store.departure[0]).to.equal(10 * 3600 + 60);
  });

  it("counts a time it cannot read rather than refusing the feed", () => {
    const store = read([HEADER + "T1,not a time,10:01:00,S1,1,0,0,1\n"]);

    expect(store.unreadableTimes).to.equal(1);
    expect(store.arrival[0]).to.equal(NO_TIME);
    expect(store.rows).to.equal(1);
  });

  it("decodes the pickup and drop off types", () => {
    const store = read([HEADER + "T1,10:00:00,10:01:00,S1,1,1,3,1\n"]);

    expect(store.pickupType(0)).to.equal(1);
    expect(store.dropOffType(0)).to.equal(3);
    expect(store.timepoint(0)).to.equal(true);
  });

  it("reads an empty pickup_type as regular, which is what GTFS says it means", () => {
    const store = read([HEADER + "T1,10:00:00,10:01:00,S1,1,,,\n"]);

    expect(store.pickupType(0)).to.equal(0);
    expect(store.dropOffType(0)).to.equal(0);
    expect(store.timepoint(0)).to.equal(undefined);
    expect(store.declared.timepoint).to.equal(true);
  });

  it("says when the file had no such column at all", () => {
    const store = read(["trip_id,arrival_time,departure_time,stop_id,stop_sequence\nT1,10:00:00,10:01:00,S1,1\n"]);

    expect(store.declared).to.deep.equal({pickup: false, dropOff: false, timepoint: false});
    expect(store.pickupType(0)).to.equal(0);
  });

  it("grows past a capacity guessed too small", () => {
    const rows = Array.from({length: 500}, (_, i) => `T1,10:00:00,10:01:00,S${i},${i + 1},0,0,1`).join("\n");
    const store = read([HEADER + rows + "\n"], 60); // one row's worth of guess, for 500 rows

    expect(store.rows).to.equal(500);
    expect(store.stopId(499)).to.equal("S499");
    expect(store.tripIx.length).to.equal(500); // sealed down to what was read
  });

  it("reads a file split across chunks at every awkward place", () => {
    const whole = HEADER + "T1,10:00:00,10:01:00,S1,1,0,0,1\nT1,10:30:00,10:31:00,S2,2,0,0,1\n";

    for (let at = 1; at < whole.length; at++) {
      const store = read([whole.slice(0, at), whole.slice(at)]);

      expect(store.rows, `split at ${at}`).to.equal(2);
      expect(store.stopId(1), `split at ${at}`).to.equal("S2");
    }
  });

});

describe("CallIndex", () => {

  it("groups rows under their key in file order", () => {
    //            row: 0  1  2  3  4
    const keys = Int32Array.from([0, 0, 1, 1, 1]);
    const index = new CallIndex(keys, 2, 5);

    expect([...index.of(0)]).to.deep.equal([0, 1]);
    expect([...index.of(1)]).to.deep.equal([2, 3, 4]);
    expect(index.count(1)).to.equal(3);
  });

  it("says so when a key's rows are one contiguous run", () => {
    const index = new CallIndex(Int32Array.from([0, 0, 1, 1]), 2, 4);

    expect(index.contiguous).to.equal(true);
  });

  it("says so when they are not, and still groups them correctly", () => {
    // Legal GTFS, and no feed this repository writes does it. A reader whose feed interleaves its
    // trips is worth telling.
    const index = new CallIndex(Int32Array.from([0, 1, 0, 1]), 2, 4);

    expect(index.contiguous).to.equal(false);
    expect([...index.of(0)]).to.deep.equal([0, 2]);
    expect([...index.of(1)]).to.deep.equal([1, 3]);
  });

  it("has nothing for a key nothing ever held", () => {
    const index = new CallIndex(Int32Array.from([0, 0]), 1, 2);

    expect([...index.of(-1)]).to.deep.equal([]);
    expect(index.count(-1)).to.equal(0);
  });

});
