import {describe, it, expect} from "vitest";
import {dropUnknownStops} from "./DropUnknownStops";
import {PickupDropOffType, StopTime} from "../entity/StopTime";
import {Schedule} from "../model/Schedule";
import {NO_DAYS, ScheduleCalendar} from "../model/ScheduleCalendar";
import {RouteType} from "../entity/Route";
import {STP} from "../model/OverlayRecord";

const call = (crs: string, sequence: number): StopTime => ({
  trip_id: "T", arrival_time: "10:00:00", departure_time: "10:01:00", stop_id: crs,
  stop_sequence: sequence, stop_headsign: null, pickup_type: PickupDropOffType.SCHEDULED, drop_off_type: PickupDropOffType.SCHEDULED,
  shape_dist_traveled: null, timepoint: 1, platform: null, tiploc: null
});

const train = (...stops: string[]): Schedule => new Schedule(
  1,
  stops.map((stop, i) => call(stop, i + 1)),
  "C00001",
  "",
  new ScheduleCalendar(
    Temporal.PlainDate.from("2024-01-01"),
    Temporal.PlainDate.from("2024-02-01"),
    {...NO_DAYS, 1: 1}
  ),
  RouteType.Rail,
  "SE",
  STP.Permanent,
  true,
  false
);

const published = new Set(["TON", "SEV", "PAD"]);

describe("dropUnknownStops", () => {

  it("removes a call at a stop the feed does not publish", () => {
    const [schedule] = dropUnknownStops([train("TON", "ZUX", "SEV")], published);

    expect(schedule.stopTimes.map(s => s.stop_id)).to.deep.equal(["TON", "SEV"]);
  });

  it("renumbers what is left, so the trip reads as one that never had the problem", () => {
    const [schedule] = dropUnknownStops([train("TON", "ZUX", "SEV", "PAD")], published);

    expect(schedule.stopTimes.map(s => s.stop_sequence)).to.deep.equal([1, 2, 3]);
  });

  it("leaves a schedule that calls only at published stops exactly as it was", () => {
    // Not merely equal: the feed is 2.87 million stop times and 36 are dropped,
    // so a schedule that loses nothing is not copied.
    const schedules = [train("TON", "SEV")];

    expect(dropUnknownStops(schedules, published)[0]).to.equal(schedules[0]);
  });

  it("leaves a trip with nothing left for the fewer-than-two-stops filter", () => {
    // Rather than dropping it here, which would put the same rule in two places.
    const [schedule] = dropUnknownStops([train("QHA", "ZUX")], published);

    expect(schedule.stopTimes).to.deep.equal([]);
  });

  it("keeps the calendar and the id of a schedule it rebuilds", () => {
    const before = train("TON", "ZUX", "SEV");
    const [after] = dropUnknownStops([before], published);

    expect(after.id).to.equal(before.id);
    expect(after.calendar).to.equal(before.calendar);
    expect(after.tripId).to.equal(before.tripId);
  });

  it("does not touch the schedule it was given", () => {
    const before = train("TON", "ZUX", "SEV");

    dropUnknownStops([before], published);

    expect(before.stopTimes.map(s => s.stop_id)).to.deep.equal(["TON", "ZUX", "SEV"]);
  });

});
