import {describe, it, expect} from "vitest";
import {Days, NO_DAYS, ScheduleCalendar} from "../model/ScheduleCalendar";
import {STP} from "../model/OverlayRecord";
import {PickupDropOffType, StopTime} from "../entity/StopTime";
import {CRS} from "../entity/Stop";
import {Schedule} from "../model/Schedule";
import {RouteType} from "../entity/Route";
import {AssociationType} from "../model/Association";
import {TripLink} from "./LinkedTrips";
import {combinedHeadsigns, onwardHeadsigns} from "./Headsigns";

describe("combinedHeadsigns", () => {

  // London Bridge to Caterham, dividing at Purley for Tattenham Corner
  const caterham = schedule("A", ["LBG", "ECR", "PUR", "KLY", "CAT"]);
  const tattenham = schedule("B", ["PUR", "RDH", "TAT"]);
  const divide = link("A", "B", "PUR");

  it("names both destinations before the divide, and neither at it", () => {
    const [named] = combinedHeadsigns([caterham, tattenham], [divide], names);

    expect(named.stopTimes.map(s => [s.stop_id, s.stop_headsign])).to.deep.equal([
      ["LBG", "Caterham and Tattenham Corner"],
      ["ECR", "Caterham and Tattenham Corner"],
      // the answer changes at Purley, so from here the trip headsign is right on its own
      ["PUR", null],
      ["KLY", null],
      ["CAT", null]
    ]);
  });

  it("leaves the train that divides off alone", () => {
    const [, off] = combinedHeadsigns([caterham, tattenham], [divide], names);

    expect(off.stopTimes.every(s => s.stop_headsign === null)).to.equal(true);
  });

  it("names all three where a train divides twice, and drops each as it goes", () => {
    const inverness = schedule("A", ["EUS", "CAR", "EDB", "STG", "INV"]);
    const aberdeen = schedule("B", ["EDB", "DEE", "ABD"]);
    const fortWilliam = schedule("C", ["STG", "FTW"]);

    const [named] = combinedHeadsigns(
      [inverness, aberdeen, fortWilliam],
      [link("A", "B", "EDB"), link("A", "C", "STG")],
      names
    );

    expect(named.stopTimes.map(s => s.stop_headsign)).to.deep.equal([
      "Inverness, Aberdeen and Fort William",
      "Inverness, Aberdeen and Fort William",
      // Aberdeen has come off, Fort William has not
      "Inverness and Fort William",
      null,
      null
    ]);
  });

  it("names a destination once, however many trips divide off for it", () => {
    // the schedule that divides off has a permanent record and an overlay of it, so the train it
    // leaves is linked to two trips that both end up at Tattenham Corner
    const [named] = combinedHeadsigns(
      [caterham, tattenham, schedule("C", ["PUR", "TAT"])],
      [divide, link("A", "C", "PUR")],
      names
    );

    expect(named.stopTimes[0].stop_headsign).to.equal("Caterham and Tattenham Corner");
  });

  it("says nothing about a join, which has one destination once it is one train", () => {
    const arriving = schedule("B", ["TAT", "RDH", "PUR"]);
    const onward = schedule("A", ["CAT", "PUR", "ECR", "LBG"]);

    const named = combinedHeadsigns(
      [arriving, onward],
      [{from: "B", to: "A", location: "PUR", type: AssociationType.Join}],
      names
    );

    expect(named.every(s => s.stopTimes.every(t => t.stop_headsign === null))).to.equal(true);
  });

  it("falls back to the CRS where the feed has no name for the destination", () => {
    const [named] = combinedHeadsigns(
      [caterham, schedule("B", ["PUR", "ZZZ"])],
      [divide],
      names
    );

    expect(named.stopTimes[0].stop_headsign).to.equal("Caterham and ZZZ");
  });

  it("leaves a trip whose coupling stop it no longer calls at alone", () => {
    // dropUnknownStops can take the divide out of the trip
    const [named] = combinedHeadsigns([schedule("A", ["LBG", "CAT"]), tattenham], [divide], names);

    expect(named.stopTimes.every(s => s.stop_headsign === null)).to.equal(true);
  });

});

describe("onwardHeadsigns", () => {

  // Tattenham Corner to Purley, where it joins the Caterham train and carries on to London Bridge
  const arriving = schedule("B", ["TAT", "RDH", "PUR"]);
  const onward = schedule("A", ["CAT", "PUR", "ECR", "LBG"]);
  const join = {from: "B", to: "A", location: "PUR", type: AssociationType.Join};

  it("heads a joining trip for where it ends up, not where it is attached", () => {
    expect(onwardHeadsigns([join], [arriving, onward], names).get("B")).to.equal("London Bridge");
  });

  it("says nothing about the train that carries on, which is headed right already", () => {
    expect(onwardHeadsigns([join], [arriving, onward], names).has("A")).to.equal(false);
  });

  it("says nothing about a divide, where the answer changes partway along instead", () => {
    const divide = {from: "A", to: "B", location: "PUR", type: AssociationType.Split};

    expect(onwardHeadsigns([divide], [arriving, onward], names).size).to.equal(0);
  });

  it("says nothing where the trip it joins is not in the feed", () => {
    expect(onwardHeadsigns([join], [arriving], names).size).to.equal(0);
  });

});

const ALL_DAYS: Days = {...NO_DAYS, 1: 1};

const names: ReadonlyMap<CRS, string> = new Map([
  ["LBG", "London Bridge"], ["ECR", "East Croydon"], ["PUR", "Purley"], ["KLY", "Kenley"],
  ["CAT", "Caterham"], ["RDH", "Reedham"], ["TAT", "Tattenham Corner"],
  ["EUS", "London Euston"], ["CAR", "Carlisle"], ["EDB", "Edinburgh"], ["STG", "Stirling"],
  ["INV", "Inverness"], ["DEE", "Dundee"], ["ABD", "Aberdeen"], ["FTW", "Fort William"]
]);

function link(from: string, to: string, location: CRS): TripLink {
  return {from, to, location, type: AssociationType.Split};
}

function schedule(tuid: string, stops: CRS[]): Schedule {
  return new Schedule(
    1,
    stops.map((stop, i) => stopTime(stop, tuid, i + 1)),
    tuid,
    "",
    new ScheduleCalendar(Temporal.PlainDate.from("2024-01-01"), Temporal.PlainDate.from("2024-02-01"), ALL_DAYS),
    RouteType.Rail,
    "SN",
    STP.Permanent,
    false,
    false
  );
}

function stopTime(stop: CRS, tripId: string, sequence: number): StopTime {
  return {
    trip_id: tripId,
    arrival_time: "10:00:00",
    departure_time: "10:01:00",
    stop_id: stop,
    stop_sequence: sequence,
    stop_headsign: null,
    pickup_type: PickupDropOffType.Scheduled,
    drop_off_type: PickupDropOffType.Scheduled,
    shape_dist_traveled: null,
    timepoint: 1,
    platform: null,
    tiploc: null
  };
}
