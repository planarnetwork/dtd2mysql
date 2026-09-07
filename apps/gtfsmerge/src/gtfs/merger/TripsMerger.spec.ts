import {describe, it, expect} from "vitest";
import {TripRow} from "@gb-transit/gtfs-schema";
import {TripsMerger} from "./TripsMerger";
import {Sequence} from "../../sequence/Sequence";
import {collect, trip} from "./Fixtures";

describe("TripsMerger", () => {

  it("re-indexes a trip whose service and route both survived", async () => {
    const trips = collect<TripRow>();
    const map = await new TripsMerger(trips, new Sequence())
      .write([trip("t1", "s1", "r1")], {s1: 7}, {r1: "9"});

    expect(map).to.deep.equal({t1: "1"});
    expect(trips.rows[0]).to.include({trip_id: "1", service_id: 7, route_id: "9"});
  });

  it("drops a trip whose route was removed", async () => {
    const trips = collect<TripRow>();
    const map = await new TripsMerger(trips, new Sequence())
      .write([trip("t1", "s1", "gone")], {s1: 7}, {});

    expect(trips.rows).to.deep.equal([]);
    expect(map).to.deep.equal({});
  });

  it("drops a trip whose calendar was filtered out", async () => {
    const trips = collect<TripRow>();
    const map = await new TripsMerger(trips, new Sequence())
      .write([trip("t1", "gone", "r1")], {}, {r1: "9"});

    expect(map).to.deep.equal({});
  });

});
