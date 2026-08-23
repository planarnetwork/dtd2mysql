import {describe, it, expect} from 'vitest';
import {STP, TUID} from "../model/OverlayRecord";
import {mergeSchedules} from "../transform/MergeSchedules";
import {applyOverlays} from "../transform/ApplyOverlays";
import {Days, ScheduleCalendar} from "../model/ScheduleCalendar";
import {StopTime} from "../entity/StopTime";
import {Schedule} from "../model/Schedule";
import {RouteType} from "../entity/Route";

describe("MergeSchedules", () => {

  it("gives every schedule a trip ID derived from its TUID and date range", () => {
    const schedules = mergeSchedules(applyOverlays([
      schedule(1, "A", "2017-01-01", "2017-01-31", STP.Permanent),
      schedule(2, "B", "2017-01-02", "2017-03-15", STP.Permanent),
    ]));

    expect(schedules.map(s => s.tripId)).to.deep.equal([
      "A_20170101_20170131",
      "B_20170102_20170315"
    ]);
  });

  it("keeps the trip ID when an overlay covering the whole schedule is withdrawn", () => {
    const overlaid = mergeSchedules(applyOverlays([
      schedule(1, "A", "2017-01-01", "2017-01-31", STP.Permanent),
      schedule(2, "A", "2017-01-01", "2017-01-31", STP.Overlay),
    ]));

    const withdrawn = mergeSchedules(applyOverlays([
      schedule(1, "A", "2017-01-01", "2017-01-31", STP.Permanent),
    ]));

    expect(overlaid).to.have.length(1);
    expect(overlaid[0].stp).to.equal(STP.Overlay);
    expect(withdrawn).to.have.length(1);
    expect(withdrawn[0].stp).to.equal(STP.Permanent);
    expect(withdrawn[0].tripId).to.equal(overlaid[0].tripId);
  });

  it("suffixes a duplicate trip ID rather than failing the build", () => {
    const duplicate = () => schedule(1, "A", "2017-01-01", "2017-01-31", STP.Permanent, ALL_DAYS, [
      stopTime("AAA", "A_20170101_20170131"),
      stopTime("BBB", "A_20170101_20170131"),
    ]);

    const schedules = mergeSchedules({ "A": [duplicate(), duplicate()] });

    expect(schedules).to.have.length(2);
    expect(schedules[0].stopTimes[0].trip_id).to.equal("A_20170101_20170131");
    expect(schedules[1].stopTimes[0].trip_id).to.equal("A_20170101_20170131_2");
  });

  it("keeps the stop times pointing at the trip they belong to", () => {
    const stale = schedule(1, "A", "2017-01-01", "2017-01-31", STP.Permanent, ALL_DAYS, [
      stopTime("AAA", "A_20170101_20171231"),
      stopTime("BBB", "A_20170101_20171231"),
    ]);

    const [merged] = mergeSchedules({ "A": [stale] });

    expect(merged.tripId).to.equal("A_20170101_20170131");
    expect(merged.stopTimes.map(s => s.trip_id)).to.deep.equal([
      "A_20170101_20170131",
      "A_20170101_20170131"
    ]);
  });

});

export const ALL_DAYS: Days = { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 };

function stopTime(stop: string, tripId: string): StopTime {
  return {
    trip_id: tripId,
    arrival_time: "10:00",
    departure_time: "10:00",
    stop_id: stop,
    stop_sequence: 1,
    stop_headsign: null,
    pickup_type: 0,
    drop_off_type: 0,
    shape_dist_traveled: null,
    timepoint: 0,
    platform: null,
    tiploc: null,
  };
}

export function schedule(id: number,
                         tuid: TUID,
                         from: string,
                         to: string,
                         stp: STP = STP.Overlay,
                         days: Days = ALL_DAYS,
                         stops: StopTime[] = []): Schedule {

  return new Schedule(
    id,
    stops,
    tuid,
    "",
    new ScheduleCalendar(
      Temporal.PlainDate.from(from),
      Temporal.PlainDate.from(to),
      days,
      {}
    ),
    RouteType.Rail,
    "LN",
    stp,
    true,
    true
  );
}

describe("mergeSchedules, when two schedules want the same trip ID", () => {

  const colliding = (operator: string) => new Schedule(
    1,
    [stopTime("A", "x"), stopTime("B", "x")],
    "A",
    "",
    new ScheduleCalendar(
      Temporal.PlainDate.from("2017-01-01"),
      Temporal.PlainDate.from("2017-01-31"),
      ALL_DAYS,
      {}
    ),
    RouteType.Rail,
    operator,
    STP.Permanent,
    true,
    false
  );

  it("gives the suffix to the same one whatever order they arrive in", () => {
    const forwards = mergeSchedules({A: [colliding("AA"), colliding("ZZ")]});
    const backwards = mergeSchedules({A: [colliding("ZZ"), colliding("AA")]});

    const tripIds = (schedules: Schedule[]) => schedules.map(s => [s.operator, s.stopTimes[0].trip_id]);

    expect(tripIds(backwards)).to.deep.equal(tripIds(forwards));
    // AA sorts before ZZ, so AA keeps the bare ID
    expect(tripIds(forwards)).to.deep.equal([
      ["AA", "A_20170101_20170131"],
      ["ZZ", "A_20170101_20170131_2"]
    ]);
  });

  it("does not depend on the order the TUIDs are held in", () => {
    const first = schedule(1, "A", "2017-01-01", "2017-01-31");
    const second = schedule(2, "B", "2017-01-01", "2017-01-31");

    const forwards = mergeSchedules({A: [first], B: [second]}).map(s => s.tuid);
    const backwards = mergeSchedules({B: [second], A: [first]}).map(s => s.tuid);

    expect(backwards).to.deep.equal(forwards);
  });

});
