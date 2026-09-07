import {describe, it, expect} from "vitest";
import CheapRuler from "cheap-ruler";
import {StopRow, TransferRow, TransferType} from "@gb-transit/gtfs-schema";
import {StopsAndTransfersMerger} from "./StopsAndTransfersMerger";
import {collect, stop} from "./Fixtures";

describe("StopsAndTransfersMerger", () => {

  const merger = (distance = 1.6) => {
    const stops = collect<StopRow>();
    const transfers = collect<TransferRow>();

    return {
      stops,
      transfers,
      merger: new StopsAndTransfersMerger(stops, transfers, new CheapRuler(54), distance)
    };
  };

  it("publishes only the stops something calls at", async () => {
    const {stops, merger: m} = merger(0);

    await m.write([stop("used", 51.5, -0.1), stop("unused", 52, -1)], [], {}, {used: true}, {});

    expect(stops.rows.map(s => s.stop_id)).to.deep.equal(["used"]);
  });

  it("generates a walk transfer between two nearby stops, both ways", async () => {
    const {transfers, merger: m} = merger();
    // Roughly 750m apart at 54N.
    const a = stop("a", 54.0, -1.0);
    const b = stop("b", 54.0, -1.0115);

    await m.write([a, b], [], {}, {a: true, b: true}, {});

    const walks = transfers.rows.filter(t => t.transfer_type === TransferType.MinTime);

    expect(walks.length).to.equal(2);
    expect(walks[0].min_transfer_time).to.be.greaterThan(60);
    expect(new Set(walks.map(t => `${t.from_stop_id}${t.to_stop_id}`))).to.deep.equal(
      new Set(["ab", "ba"])
    );
  });

  it("generates no walk transfer between two distant stops", async () => {
    const {transfers, merger: m} = merger();

    await m.write(
      [stop("a", 54.0, -1.0), stop("b", 51.5, -0.1)], [], {}, {a: true, b: true}, {}
    );

    expect(transfers.rows).to.deep.equal([]);
  });

  it("measures a gap the same way a map would", async () => {
    const {transfers, merger: m} = merger();
    // 0.005 degrees of longitude at 54N is 327m. Passing the coordinates the
    // wrong way round, as this used to, gives 557m.
    await m.write(
      [stop("a", 54.0, -1.0), stop("b", 54.0, -1.005)], [], {}, {a: true, b: true}, {}
    );

    expect(transfers.rows[0].min_transfer_time).to.equal(328);
  });

  it("remaps the trips a coupling names", async () => {
    const {transfers, merger: m} = merger(0);
    const coupling: TransferRow = {
      from_stop_id: "s", to_stop_id: "s", from_trip_id: "old-a", to_trip_id: "old-b",
      transfer_type: TransferType.InSeat, min_transfer_time: null
    };

    await m.write([], [coupling], {}, {s: true}, {"old-a": "1", "old-b": "2"});

    expect(transfers.rows[0]).to.include({from_trip_id: "1", to_trip_id: "2"});
  });

  it("drops a coupling whose trip was dropped", async () => {
    const {transfers, merger: m} = merger(0);
    const coupling: TransferRow = {
      from_stop_id: "s", to_stop_id: "s", from_trip_id: "old-a", to_trip_id: "gone",
      transfer_type: TransferType.InSeat, min_transfer_time: null
    };

    await m.write([], [coupling], {}, {s: true}, {"old-a": "1"});

    expect(transfers.rows).to.deep.equal([]);
  });

  it("drops a transfer to a stop nothing calls at", async () => {
    const {transfers, merger: m} = merger(0);
    const transfer: TransferRow = {
      from_stop_id: "used", to_stop_id: "unused", transfer_type: TransferType.MinTime,
      min_transfer_time: 120
    };

    // Only the stops something calls at are published, so the other end of this
    // would be a reference to a row that is not in the feed.
    await m.write([], [transfer], {}, {used: true}, {});

    expect(transfers.rows).to.deep.equal([]);
  });

  it("moves a transfer onto the station rather than the platform", async () => {
    const {transfers, merger: m} = merger(0);
    const transfer: TransferRow = {
      from_stop_id: "platform", to_stop_id: "other", transfer_type: TransferType.MinTime,
      min_transfer_time: 120
    };

    await m.write([], [transfer], {platform: "station"}, {station: true, other: true}, {});

    expect(transfers.rows[0].from_stop_id).to.equal("station");
  });

});
