import { describe, it, expect } from "vitest";
import type { GTFSFeed } from "./GTFSLoader.js";
import type { Stop, StopID, StopTime, Time, Trip } from "./GTFS.js";
import { isCall, normalise } from "./Normalise.js";
import { Service } from "./Service.js";

const allDays = { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true };
const everyDay = new Service(20180101, 20181231, allDays, {});

function stop(id: StopID, fields: Partial<Stop> = {}): Stop {
  return { id, latitude: 0, longitude: 0, locationType: 0, ...fields };
}

function st(stopId: StopID, arrivalTime: Time | null, departureTime: Time | null): StopTime {
  return {
    stop: stopId,
    arrivalTime: arrivalTime ?? departureTime!,
    departureTime: departureTime ?? arrivalTime!,
    dropOff: arrivalTime !== null,
    pickUp: departureTime !== null
  };
}

/** A passing point: the vehicle goes through without setting down or picking up */
function passing(stopId: StopID, time: Time): StopTime {
  return { stop: stopId, arrivalTime: time, departureTime: time, dropOff: false, pickUp: false };
}

function trip(tripId: string, ...stopTimes: StopTime[]): Trip {
  return { tripId, serviceId: tripId, stopTimes, service: everyDay };
}

function feed(stops: Stop[], overrides: Partial<GTFSFeed> = {}): GTFSFeed {
  return {
    trips: [],
    transfers: {},
    links: [],
    interchange: {},
    stops: Object.fromEntries(stops.map(s => [s.id, s])),
    ...overrides
  };
}

describe("isCall", () => {

  it("is a call a passenger can board or alight", () => {
    expect(isCall(st("A", null, 100))).to.equal(true);
    expect(isCall(st("A", 100, null))).to.equal(true);
    expect(isCall(st("A", 100, 200))).to.equal(true);
  });

  it("is not a point the vehicle only passes through", () => {
    expect(isCall(passing("A", 100))).to.equal(false);
  });

});

describe("normalise", () => {

  it("names a station by its stop_code", () => {
    const { stations } = normalise(feed([stop("9100NRCH", { code: "NRW" })]));

    expect(stations.get("9100NRCH")).to.equal("NRW");
  });

  it("names a station by its stop_id where the feed gives no stop_code", () => {
    const { stations } = normalise(feed([stop("A")]));

    expect(stations.get("A")).to.equal("A");
  });

  it("resolves a platform to the station it belongs to", () => {
    const { stations } = normalise(feed([
      stop("9100NRCH", { code: "NRW", locationType: 1 }),
      stop("9100NRCH1", { parentStation: "9100NRCH" }),
      stop("9100NRCH2", { parentStation: "9100NRCH" })
    ]));

    expect(stations.get("9100NRCH1")).to.equal("NRW");
    expect(stations.get("9100NRCH2")).to.equal("NRW");
  });

  /**
   * A feed may group stops under a station and those under a station in turn, so the walk up is
   * bounded rather than assumed to terminate. A parent that points back at its own child is the
   * shape that would otherwise hang the load.
   */
  it("walks up through several levels of grouping", () => {
    const { stations } = normalise(feed([
      stop("station", { code: "NRW" }),
      stop("concourse", { parentStation: "station" }),
      stop("platform", { parentStation: "concourse" })
    ]));

    expect(stations.get("platform")).to.equal("NRW");
  });

  it("gives up rather than looping on a feed whose stops parent each other", () => {
    const { stations } = normalise(feed([
      stop("a", { parentStation: "b" }),
      stop("b", { parentStation: "a" })
    ]));

    // whichever it stops at, it stops
    expect(stations.get("a") === "a" || stations.get("a") === "b").to.equal(true);
  });

  /**
   * GTFS puts no uniqueness requirement on stop_code, but it is what the timetable plans between,
   * so two stations sharing one would be planned as the same place. Refused rather than merged.
   */
  it("refuses a feed where two stations share a stop_code", () => {
    expect(() => normalise(feed([
      stop("9100NRCH", { code: "NRW" }),
      stop("9100NRWX", { code: "NRW" })
    ]))).to.throw(/both have the stop_code NRW/);
  });

  it("allows the platforms of one station to share its code", () => {
    expect(() => normalise(feed([
      stop("9100NRCH", { code: "NRW" }),
      stop("9100NRCH1", { code: "NRW", parentStation: "9100NRCH" })
    ]))).not.to.throw();
  });

  it("keeps only the trips a passenger can both board and alight", () => {
    const { trips } = normalise(feed([stop("A"), stop("B")], {
      trips: [
        trip("usable", st("A", null, 100), st("B", 200, null)),
        trip("one call", st("A", null, 100), passing("B", 200)),
        trip("no calls", passing("A", 100), passing("B", 200))
      ]
    }));

    expect(trips.map(t => t.tripId)).to.deep.equal(["usable"]);
  });

  /**
   * The trips keep the stopping pattern the feed gave them, passing points and all - where a call
   * is is answered by `calls` rather than by rewriting the stop times.
   */
  it("answers where the calls are without touching the trip", () => {
    const original = trip("t", st("A", null, 100), passing("B", 150), st("C", 200, null));
    const { trips, calls } = normalise(feed([stop("A"), stop("B"), stop("C")], { trips: [original] }));

    expect(trips[0].stopTimes.length).to.equal(3);
    expect(calls[0].map(c => c.stop)).to.deep.equal(["A", "C"]);
    expect(trips.length).to.equal(calls.length);
  });

  it("moves interchange time onto the station", () => {
    const { interchange } = normalise(feed([
      stop("9100NRCH", { code: "NRW" }),
      stop("9100NRCH1", { parentStation: "9100NRCH" })
    ], {
      interchange: { "9100NRCH1": 300 }
    }));

    expect(interchange.NRW).to.equal(300);
  });

  it("moves a transfer onto the stations at either end", () => {
    const { transfers } = normalise(feed([
      stop("9100NRCH", { code: "NRW" }),
      stop("9100NRCH1", { parentStation: "9100NRCH" }),
      stop("9100LIVST", { code: "LST" })
    ], {
      transfers: {
        "9100NRCH1": [{
          origin: "9100NRCH1", destination: "9100LIVST", duration: 300, startTime: 0, endTime: 100
        }]
      }
    }));

    expect(transfers.length).to.equal(1);
    expect(transfers[0].origin).to.equal("NRW");
    expect(transfers[0].destination).to.equal("LST");
    expect(transfers[0].duration).to.equal(300);
  });

  /**
   * Two platforms of one station resolve to the same place, and moving between them is what
   * interchange time is for rather than a footpath from a station to itself.
   */
  it("drops a transfer between two platforms of the same station", () => {
    const { transfers } = normalise(feed([
      stop("9100NRCH", { code: "NRW" }),
      stop("9100NRCH1", { parentStation: "9100NRCH" }),
      stop("9100NRCH2", { parentStation: "9100NRCH" })
    ], {
      transfers: {
        "9100NRCH1": [{
          origin: "9100NRCH1", destination: "9100NRCH2", duration: 60, startTime: 0, endTime: 100
        }]
      }
    }));

    expect(transfers).to.deep.equal([]);
  });

  it("adds the through trip a coupling makes, alongside the two it couples", () => {
    const portion = trip("p", st("A", null, 100), st("B", 200, 200));
    const base = trip("b", st("B", 250, 300), st("C", 400, null));

    const { trips } = normalise(feed([stop("A"), stop("B"), stop("C")], {
      trips: [portion, base],
      links: [{ fromTripId: "p", toTripId: "b", fromStop: "B", toStop: "B" }]
    }));

    expect(trips.map(t => t.tripId).sort()).to.deep.equal(["b", "p", "p_b"]);
  });

});
