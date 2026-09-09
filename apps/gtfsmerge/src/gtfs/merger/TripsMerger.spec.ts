import {describe, it, expect} from "vitest";
import {TripRow} from "@gb-transit/gtfs-schema";
import {TripsMerger} from "./TripsMerger";
import {Sequence} from "../../sequence/Sequence";
import {collect, trip} from "./Fixtures";

const merger = (trips: ReturnType<typeof collect<TripRow>>) =>
  new TripsMerger(trips, new Sequence(), new Sequence(), new Sequence());

describe("TripsMerger", () => {

  it("re-indexes a trip whose service and route both survived", async () => {
    const trips = collect<TripRow>();
    const [map] = await merger(trips).write([trip("t1", "s1", "r1")], {s1: 7}, {r1: "9"});

    expect(map).to.deep.equal({t1: "1"});
    expect(trips.rows[0]).to.include({trip_id: "1", service_id: 7, route_id: "9"});
  });

  it("drops a trip whose route was removed", async () => {
    const trips = collect<TripRow>();
    const [map] = await merger(trips).write([trip("t1", "s1", "gone")], {s1: 7}, {});

    expect(trips.rows).to.deep.equal([]);
    expect(map).to.deep.equal({});
  });

  it("drops a trip whose calendar was filtered out", async () => {
    const trips = collect<TripRow>();
    const [map] = await merger(trips).write([trip("t1", "gone", "r1")], {}, {r1: "9"});

    expect(map).to.deep.equal({});
  });

  /**
   * A block is one vehicle working through a day, named by the feed that
   * published it and by nobody else. Two feeds numbering a block `1` do not mean
   * the same vehicle, so each feed's are renumbered as its trips are.
   */
  it("renumbers a block, and keeps two trips in the same one together", async () => {
    const trips = collect<TripRow>();

    await merger(trips).write(
      [
        {...trip("t1", "s1", "r1"), block_id: "B"},
        {...trip("t2", "s1", "r1"), block_id: "B"},
        {...trip("t3", "s1", "r1"), block_id: "C"}
      ],
      {s1: 7},
      {r1: "9"}
    );

    expect(trips.rows.map(row => row.block_id)).to.deep.equal(["1", "1", "2"]);
  });

  it("leaves a trip with no block without one", async () => {
    const trips = collect<TripRow>();

    await merger(trips).write([trip("t1", "s1", "r1")], {s1: 7}, {r1: "9"});

    expect(trips.rows[0].block_id).to.equal(undefined);
  });

  it("renumbers a shape and reports the map its points are rewritten with", async () => {
    const trips = collect<TripRow>();
    const [, shapeIdMap] = await merger(trips).write(
      [
        {...trip("t1", "s1", "r1"), shape_id: "SHP1"},
        {...trip("t2", "s1", "r1"), shape_id: "SHP1"},
        {...trip("t3", "s1", "r1"), shape_id: "SHP2"}
      ],
      {s1: 7},
      {r1: "9"}
    );

    expect(trips.rows.map(row => row.shape_id)).to.deep.equal(["1", "1", "2"]);
    expect(shapeIdMap).to.deep.equal({SHP1: "1", SHP2: "2"});
  });

  it("does not name the shape of a trip that was dropped", async () => {
    const trips = collect<TripRow>();
    const [, shapeIdMap] = await merger(trips).write(
      [{...trip("t1", "gone", "r1"), shape_id: "SHP1"}],
      {},
      {r1: "9"}
    );

    expect(shapeIdMap).to.deep.equal({});
  });

});
