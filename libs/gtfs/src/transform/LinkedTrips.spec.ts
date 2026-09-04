import {describe, it, expect} from "vitest";
import {Days, NO_DAYS, ScheduleCalendar} from "../model/ScheduleCalendar";
import {STP} from "../model/OverlayRecord";
import {StopTime} from "../entity/StopTime";
import {CRS, TIPLOC} from "../entity/Stop";
import {Schedule} from "../model/Schedule";
import {RouteType} from "../entity/Route";
import {AssociationLink, AssociationType} from "../model/Association";
import {linkedTrips, resolveLinks} from "./LinkedTrips";

describe("resolveLinks", () => {

  it("names the trips the schedules were given", () => {
    const [links] = [[link(1, 2)]];

    expect(resolveLinks(links, [schedule(1, "A", ["TON", "ASH"]), schedule(2, "B", ["ASH", "DOV"])]))
      .to.deep.equal([{from: "A_20240101_20240201", to: "B_20240101_20240201", location: "ASH", type: AssociationType.Split}]);
  });

  it("drops a coupling naming a schedule that is no longer there", () => {
    // the schedule a later association replaced, so nothing carries its id any more
    expect(resolveLinks([link(1, 99)], [schedule(1, "A", ["TON", "ASH"])])).to.deep.equal([]);
  });

  it("drops a coupling naming an id handed out more than once", () => {
    const twice = [schedule(1, "A", ["TON", "ASH"]), schedule(1, "B", ["ASH", "DOV"])];

    expect(resolveLinks([link(1, 1)], twice)).to.deep.equal([]);
  });

  it("ignores a schedule with no stop times, which is no trip to name", () => {
    expect(resolveLinks([link(1, 2)], [schedule(1, "A", ["TON", "ASH"]), schedule(2, "B", [])]))
      .to.deep.equal([]);
  });

});

describe("linkedTrips", () => {

  const trips = [schedule(1, "A", ["TON", "ASH", "RAM"]), schedule(2, "B", ["ASH", "DOV"])];
  const coupling = {from: "A_20240101_20240201", to: "B_20240101_20240201", location: "ASH", type: AssociationType.Split};

  it("writes the coupling against the boarding point each trip calls at", () => {
    const [row] = linkedTrips([coupling], trips, tiplocs);

    expect(row.from_stop_id).to.equal("9100ASHFKY");
    expect(row.to_stop_id).to.equal("9100ASHFKY");
    expect(row.from_trip_id).to.equal("A_20240101_20240201");
    expect(row.to_trip_id).to.equal("B_20240101_20240201");
    expect(row.transfer_type).to.equal(4);
  });

  it("takes the platform each trip named, where the source disagrees about it", () => {
    const arrives = schedule(1, "A", ["TON", "ASH", "RAM"], "3");
    const leaves = schedule(2, "B", ["ASH", "DOV"], "1");
    const [row] = linkedTrips([coupling], [arrives, leaves], tiplocs);

    expect(row.from_stop_id).to.equal("9100ASHFKY3");
    expect(row.to_stop_id).to.equal("9100ASHFKY1");
  });

  it("carries no calendar and no transfer time, because the trips say both", () => {
    const [row] = linkedTrips([coupling], trips, tiplocs);

    expect(row.min_transfer_time).to.equal(null);
    expect(row.start_date).to.equal(null);
    expect(row.end_date).to.equal(null);
    expect(row.monday).to.equal(null);
    expect(row.mode).to.equal(null);
  });

  it("drops a coupling naming a trip the feed does not write", () => {
    // one stop is not a trip, so nothing joins to it
    expect(linkedTrips([coupling], [trips[0], schedule(2, "B", ["ASH"])], tiplocs)).to.deep.equal([]);
  });

  it("drops a coupling where a trip no longer calls at the station it names", () => {
    // dropUnknownStops can take the coupling point out of a trip
    expect(linkedTrips([coupling], [trips[0], schedule(2, "B", ["DOV", "RAM"])], tiplocs)).to.deep.equal([]);
  });

});

const ALL_DAYS: Days = {...NO_DAYS, 1: 1};

const tiplocs: ReadonlyMap<CRS, TIPLOC> = new Map([
  ["TON", "TONBDG"], ["ASH", "ASHFKY"], ["RAM", "RAMSGTE"], ["DOV", "DOVERP"]
]);

function link(from: number, to: number): AssociationLink {
  return {from, to, location: "ASH", type: AssociationType.Split};
}

function schedule(id: number, tuid: string, stops: CRS[], platform: string | null = null): Schedule {
  const tripId = `${tuid}_20240101_20240201`;

  return new Schedule(
    id,
    stops.map((stop, i) => stopTime(stop, tripId, i + 1, platform)),
    tuid,
    "",
    new ScheduleCalendar(Temporal.PlainDate.from("2024-01-01"), Temporal.PlainDate.from("2024-02-01"), ALL_DAYS),
    RouteType.Rail,
    "SE",
    STP.Permanent,
    false,
    false
  );
}

function stopTime(stop: CRS, tripId: string, sequence: number, platform: string | null): StopTime {
  return {
    trip_id: tripId,
    arrival_time: "10:00:00",
    departure_time: "10:01:00",
    stop_id: stop,
    stop_sequence: sequence,
    stop_headsign: null,
    pickup_type: 0,
    drop_off_type: 0,
    shape_dist_traveled: null,
    timepoint: 1,
    platform,
    tiploc: null
  };
}
