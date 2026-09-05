import {describe, it, expect} from 'vitest';
import {Days, ScheduleCalendar} from "../model/ScheduleCalendar";
import {STP, TUID} from "../model/OverlayRecord";
import {PickupDropOffType, StopTime} from "../entity/StopTime";
import {CRS} from "../entity/Stop";
import {Association, AssociationType, DateIndicator} from "../model/Association";
import {applyAssociations, AssociationIndex, ScheduleIndex} from "../transform/ApplyAssociations";
import {applyOverlays} from "../transform/ApplyOverlays";
import {schedule} from "./MergeSchedules.spec";

describe("ApplyAssociations", () => {

  it("matches the correct base schedule", () => {
    const base1 = schedule(1, "A", "2017-07-10", "2017-07-10", STP.Overlay, ALL_DAYS, [
      stop(1, "TON", "22:30"),
      stop(2, "PDW", "23:30"),
      stop(3, "ASH", "24:30"),
      stop(4, "RAM", "25:00"),
    ]);

    const assoc1 = schedule(2, "B", "2017-07-11", "2017-07-11", STP.Overlay, ALL_DAYS, [
      stop(1, "ASH", "00:35"),
      stop(2, "DOV", "01:00"),
    ]);

    const base2 = schedule(3, "A", "2017-07-11", "2017-07-11", STP.Overlay, ALL_DAYS, [
      stop(1, "TON", "22:30"),
      stop(2, "ASH", "24:30"),
      stop(3, "RAM", "25:00"),
    ]);

    const assoc2 = schedule(4, "B", "2017-07-12", "2017-07-12", STP.Overlay, ALL_DAYS, [
      stop(1, "ASH", "00:35"),
      stop(2, "DOV", "01:00"),
      stop(3, "SEA", "01:30"),
    ]);

    // create an association record that spans both base1, base2 and assoc1, assoc2
    const calendar = new ScheduleCalendar(Temporal.PlainDate.from("2017-07-01"), Temporal.PlainDate.from("2017-07-31"), ALL_DAYS);
    const association1 = association("A", "B", AssociationType.Split, "ASH", DateIndicator.Next, calendar);

    const {schedules, links} = applyAssociations(
      applyOverlays([base1, assoc1, base2, assoc2]) as ScheduleIndex,
      applyOverlays([association1]) as AssociationIndex,
      idGenerator(),
      true
    );

    // nothing is concatenated, so there is no combined TUID at all
    expect(schedules["A_B"]).to.be.undefined;

    // the bases are untouched, stops and calendars both
    expect(schedules["A"].map(s => s.stopTimes.map(t => t.stop_id))).to.deep.equal([
      ["TON", "PDW", "ASH", "RAM"],
      ["TON", "ASH", "RAM"]
    ]);

    // Each is published twice: on the day its own base ran, which is what the coupling names, and
    // on the day its own record gives, which is where a passenger boarding it looks.
    const associated = schedules["B"];

    // Each on the day its own base ran. These depart at 00:35, which shiftLateNightServices puts back
    // on the previous day anyway, so there is no second copy to publish.
    expect(associated.map(s => [s.calendar.runsFrom.toString(), s.stopTimes[0].departure_time])).to.deep.equal([
      ["2017-07-11", "00:35:30"],
      ["2017-07-12", "00:35:30"]
    ]);

    // make sure that it only matches base1 to assoc1 and base2 to assoc2
    expect(links).to.have.length(2);
    expect(links[0].from).to.equal(base1.id);
    expect(links[0].to).to.equal(associated[0].id);
    expect(links[0].location).to.equal("ASH");
    expect(links[1].from).to.equal(base2.id);
    expect(links[1].to).to.equal(associated[1].id);
  });

  it("does not couple an associated schedule a second time", () => {
    const base = schedule(1, "A", "2017-07-10", "2017-07-19", STP.Overlay, ALL_DAYS, [
      stop(1, "TON", "22:30"),
      stop(2, "ASH", "23:30"),
    ]);

    // runs the day after the base, so with the flag on each application copies it onto the base's
    // day at 28:18 as well as leaving it where its own record dates it
    const assoc = schedule(2, "B", "2017-07-11", "2017-07-20", STP.Overlay, ALL_DAYS, [
      stop(1, "ASH", "04:18"),
      stop(2, "DOV", "04:40"),
    ]);

    // The second record's dates, counted in the associated schedule's days, land on the days the
    // first one produced - which are counted in the base's. Left where an association
    // looks, it matches and is moved onto a base's day all over again.
    const first = association("A", "B", AssociationType.Split, "ASH", DateIndicator.Next,
      new ScheduleCalendar(Temporal.PlainDate.from("2017-07-12"), Temporal.PlainDate.from("2017-07-14"), ALL_DAYS));
    const second = association("A", "B", AssociationType.Split, "ASH", DateIndicator.Next,
      new ScheduleCalendar(Temporal.PlainDate.from("2017-07-11"), Temporal.PlainDate.from("2017-07-13"), ALL_DAYS));

    const {schedules, links} = applyAssociations(
      applyOverlays([base, assoc]) as ScheduleIndex,
      {"A_B_ASH": [first, second]} as AssociationIndex,
      idGenerator(),
      true
    );

    // three 04:18 - the days it runs uncoupled, and the coupled days of each association - and one
    // 28:18 for each of those two associations, told on the day its base left
    expect(schedules["B"].map(s => s.stopTimes[0].arrival_time).sort())
      .to.deep.equal(["04:18", "04:18", "04:18", "28:18", "28:18"]);
    expect(links).to.have.length(2);
  });

  it("copies nothing onto the base's day unless asked", () => {
    const base = schedule(1, "A", "2017-07-10", "2017-07-19", STP.Overlay, ALL_DAYS, [
      stop(1, "TON", "22:30"),
      stop(2, "ASH", "23:30"),
    ]);

    const assoc = schedule(2, "B", "2017-07-11", "2017-07-20", STP.Overlay, ALL_DAYS, [
      stop(1, "ASH", "04:18"),
      stop(2, "DOV", "04:40"),
    ]);

    const first = association("A", "B", AssociationType.Split, "ASH", DateIndicator.Next,
      new ScheduleCalendar(Temporal.PlainDate.from("2017-07-12"), Temporal.PlainDate.from("2017-07-14"), ALL_DAYS));
    const second = association("A", "B", AssociationType.Split, "ASH", DateIndicator.Next,
      new ScheduleCalendar(Temporal.PlainDate.from("2017-07-11"), Temporal.PlainDate.from("2017-07-13"), ALL_DAYS));

    const {schedules, links} = applyAssociations(
      applyOverlays([base, assoc]) as ScheduleIndex,
      {"A_B_ASH": [first, second]} as AssociationIndex,
      idGenerator(),
      false
    );

    // the same three schedules, and no second copy of either coupled one. Every day the train runs
    // is published exactly once, which is what the default is for
    expect(schedules["B"].map(s => s.stopTimes[0].arrival_time).sort())
      .to.deep.equal(["04:18", "04:18", "04:18"]);
    expect(links).to.have.length(2);
  });

  it("gives every schedule it produces an id of its own", () => {
    const base = schedule(1, "A", "2017-07-10", "2017-07-16", STP.Overlay, ALL_DAYS, [
      stop(1, "TON", "10:00"),
      stop(2, "ASH", "12:00"),
    ]);

    // runs a fortnight, but the association only covers the first week of it
    const assoc = schedule(2, "B", "2017-07-10", "2017-07-23", STP.Overlay, ALL_DAYS, [
      stop(1, "ASH", "12:05"),
      stop(2, "DOV", "13:00"),
    ]);

    const calendar = new ScheduleCalendar(
      Temporal.PlainDate.from("2017-07-10"), Temporal.PlainDate.from("2017-07-16"), ALL_DAYS
    );

    const {schedules} = applyAssociations(
      applyOverlays([base, assoc]) as ScheduleIndex,
      applyOverlays([association("A", "B", AssociationType.Split, "ASH", DateIndicator.Same, calendar)]) as AssociationIndex,
      idGenerator(),
      true
    );

    // the ids are what a link names a trip by until the trip ids are settled, so
    // two schedules sharing one would couple the wrong pair of trains
    const ids = Object.values(schedules).flat().map(s => s.id);

    expect(new Set(ids).size).to.equal(ids.length);
  });

});

const ALL_DAYS: Days = { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 };


export function stop(stopSequence: number, location: CRS, time: string): StopTime {
  return {
    trip_id: "C00001_20170101_20170101",
    arrival_time: time,
    departure_time: time + ":30",
    stop_id: location,
    stop_sequence: stopSequence,
    stop_headsign: null,
    pickup_type: PickupDropOffType.Scheduled,
    drop_off_type: PickupDropOffType.Scheduled,
    shape_dist_traveled: null,
    timepoint: 0,
    platform: null,
    tiploc: null,
  };
}

function association(base: TUID,
                     assoc: TUID,
                     type: AssociationType,
                     location: CRS,
                     dateIndicator: DateIndicator = DateIndicator.Same,
                     calendar: ScheduleCalendar): Association {
  return new Association(
    1,
    base,
    assoc,
    location,
    dateIndicator,
    type,
    calendar,
    STP.Overlay
  );
}

function *idGenerator(): IterableIterator<number> {
  let id = 100;
  while (true) {
    yield id++;
  }
}
