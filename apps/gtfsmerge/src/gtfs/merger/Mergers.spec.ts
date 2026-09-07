import {describe, it, expect} from "vitest";
import CheapRuler from "cheap-ruler";
import {
  CalendarDateRow, CalendarRow, RouteRow, RouteType, RowWriter, StopRow, StopTimeRow, TransferRow,
  TransferType, TripRow
} from "@gb-transit/gtfs-schema";
import {RouteMerger} from "./RouteMerger";
import {TripsMerger} from "./TripsMerger";
import {StopTimesMerger} from "./StopTimesMerger";
import {StopsAndTransfersMerger} from "./StopsAndTransfersMerger";
import {CalendarMerger} from "./CalendarMerger";
import {CalendarFactory} from "../calendar/CalendarFactory";
import {Sequence} from "../../sequence/Sequence";
import {MemoizedSequence} from "../../sequence/MemoizedSequence";
import {DedupingWriter} from "../DedupingWriter";

/**
 * Collects the rows written to it.
 *
 * None of these classes had a test before this file. The merge is where every
 * id in a feed is renumbered, so a mistake here is a dangling reference in the
 * output rather than a crash.
 */
function collect<T>(): RowWriter<T> & {rows: T[]} {
  const rows: T[] = [];

  return {
    rows,
    write(row: T) { rows.push({...row}); return true; },
    drain: async () => {},
    end() {},
    finished: async () => {}
  };
}

const route = (id: string, type: RouteType): RouteRow => ({
  route_id: id, agency_id: "a", route_short_name: id, route_long_name: null, route_type: type,
  route_text_color: null, route_color: null, route_url: null, route_desc: null
});

const trip = (id: string, service: string | number, routeId: string): TripRow => ({
  route_id: routeId, service_id: service, trip_id: id, trip_headsign: "x", trip_short_name: "y",
  direction_id: 0, wheelchair_accessible: 0, bikes_allowed: 0
});

const stopTime = (tripId: string, stopId: string, sequence: number): StopTimeRow => ({
  trip_id: tripId, arrival_time: "10:00:00", departure_time: "10:01:00", stop_id: stopId,
  stop_sequence: sequence, stop_headsign: null, pickup_type: 0, drop_off_type: 0,
  shape_dist_traveled: null, timepoint: 1
});

const stop = (id: string, lat: number, lon: number): StopRow => ({
  stop_id: id, stop_code: id, stop_name: id, stop_desc: null, zone_id: null, stop_url: null,
  location_type: 0, parent_station: null, platform_code: null, stop_timezone: null,
  wheelchair_boarding: 0, stop_lon: lon, stop_lat: lat
});

const calendar = (id: string | number, from: string, to: string, monday: 0 | 1 = 1): CalendarRow => ({
  service_id: id, monday, tuesday: 0, wednesday: 0, thursday: 0, friday: 0, saturday: 0, sunday: 0,
  start_date: from, end_date: to
});

describe("RouteMerger", () => {

  it("re-indexes the routes and maps the old id to the new", async () => {
    const routes = collect<RouteRow>();
    const map = await new RouteMerger(routes, new Sequence(), {}).write([
      route("original-a", RouteType.Rail), route("original-b", RouteType.Bus)
    ]);

    expect(routes.rows.map(r => r.route_id)).to.deep.equal(["1", "2"]);
    expect(map).to.deep.equal({"original-a": "1", "original-b": "2"});
  });

  it("drops a route of a removed type, and leaves it out of the map", async () => {
    const routes = collect<RouteRow>();
    const map = await new RouteMerger(routes, new Sequence(), {[RouteType.Bus]: true}).write([
      route("rail", RouteType.Rail), route("bus", RouteType.Bus)
    ]);

    expect(routes.rows.length).to.equal(1);
    expect(map["bus"]).to.equal(undefined);
  });

});

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

describe("CalendarMerger", () => {

  const merger = () => {
    const calendars = collect<CalendarRow>();
    const dates = collect<CalendarDateRow>();

    return {
      calendars,
      dates,
      merger: new CalendarMerger(calendars, dates, new CalendarFactory(), new MemoizedSequence())
    };
  };

  it("collapses two identical calendars onto one service", async () => {
    const {calendars, merger: m} = merger();
    const map = await m.write([calendar("a", "20260101", "20261231"), calendar("b", "20260101", "20261231")], {});

    // Same days, same dates, so the same service however the two feeds numbered it.
    expect(calendars.rows.length).to.equal(1);
    expect(map).to.deep.equal({a: 1, b: 1});
  });

  it("keeps two calendars that differ", async () => {
    const {calendars, merger: m} = merger();

    await m.write([calendar("a", "20260101", "20261231"), calendar("b", "20260101", "20261231", 0)], {});

    expect(calendars.rows.length).to.equal(2);
  });

  it("synthesises a calendar for dates with no calendar row", async () => {
    const {calendars, merger: m} = merger();
    const map = await m.write([], {
      orphan: [
        {service_id: "orphan", date: "20260105", exception_type: 1},
        {service_id: "orphan", date: "20260112", exception_type: 1}
      ]
    });

    expect(calendars.rows.length).to.equal(1);
    expect(map["orphan"]).to.not.equal(undefined);
  });

});

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

    await m.write([], [coupling], {}, {}, {"old-a": "1", "old-b": "2"});

    expect(transfers.rows[0]).to.include({from_trip_id: "1", to_trip_id: "2"});
  });

  it("drops a coupling whose trip was dropped", async () => {
    const {transfers, merger: m} = merger(0);
    const coupling: TransferRow = {
      from_stop_id: "s", to_stop_id: "s", from_trip_id: "old-a", to_trip_id: "gone",
      transfer_type: TransferType.InSeat, min_transfer_time: null
    };

    await m.write([], [coupling], {}, {}, {"old-a": "1"});

    expect(transfers.rows).to.deep.equal([]);
  });

  it("moves a transfer onto the station rather than the platform", async () => {
    const {transfers, merger: m} = merger(0);
    const transfer: TransferRow = {
      from_stop_id: "platform", to_stop_id: "other", transfer_type: TransferType.MinTime,
      min_transfer_time: 120
    };

    await m.write([], [transfer], {platform: "station"}, {}, {});

    expect(transfers.rows[0].from_stop_id).to.equal("station");
  });

});

describe("DedupingWriter", () => {

  it("writes a key once", () => {
    const rows = collect<StopRow>();
    const writer = new DedupingWriter(rows, row => row.stop_id);

    writer.write(stop("a", 1, 1));
    writer.write(stop("a", 1, 1));
    writer.write(stop("b", 1, 1));

    expect(rows.rows.map(r => r.stop_id)).to.deep.equal(["a", "b"]);
  });

});
