import {describe, expect, it} from 'vitest';
import {Days, ScheduleCalendar} from "../model/ScheduleCalendar";
import {STP} from "../model/OverlayRecord";
import {PickupDropOffType, StopTime} from "../entity/StopTime";
import {Schedule} from "../model/Schedule";
import {CRS} from "../entity/Stop";
import {Association, AssociationType, DateIndicator} from "../model/Association";
import {applyOverlays} from "../transform/ApplyOverlays";
import {schedule} from "../transform/MergeSchedules.spec";

describe("Association", () => {

  it("leaves both schedules whole and links them, for a split", () => {
    const base = schedule(1, "A", "2017-07-10", "2017-07-16", STP.Overlay, ALL_DAYS, [
      stop(1, "TON", "10:00"),
      stop(2, "PDW", "11:00"),
      stop(3, "ASH", "12:00"),
      stop(4, "RAM", "13:00"),
    ]);

    const assoc = schedule(2, "B", "2017-07-10", "2017-07-16", STP.Overlay, ALL_DAYS, [
      stop(1, "ASH", "12:05"),
      stop(2, "DOV", "13:00"),
    ]);

    const result = association(base, assoc, AssociationType.Split, "ASH").apply(base, assoc, idGenerator())!;

    // what comes back is the associated schedule, not a concatenation of the two
    expect(result.associated.tuid).to.equal("B");
    expect(result.associated.stopTimes.map(s => s.stop_id)).to.deep.equal(["ASH", "DOV"]);
    // the base keeps every stop it had
    expect(base.stopTimes.map(s => s.stop_id)).to.deep.equal(["TON", "PDW", "ASH", "RAM"]);

    // a split runs the base first, so that is the trip the link comes from
    expect(result.link.from).to.equal(base.id);
    expect(result.link.to).to.equal(result.associated.id);
    expect(result.link.location).to.equal("ASH");
  });

  it("links the associated schedule to the base, for a join", () => {
    const base = schedule(1, "A", "2017-07-10", "2017-07-16", STP.Overlay, ALL_DAYS, [
      stop(1, "RAM", "10:00"),
      stop(2, "ASH", "12:00"),
      stop(3, "TON", "14:00"),
    ]);

    const assoc = schedule(2, "B", "2017-07-10", "2017-07-16", STP.Overlay, ALL_DAYS, [
      stop(1, "DOV", "11:00"),
      stop(2, "ASH", "11:55"),
    ]);

    const result = association(base, assoc, AssociationType.Join, "ASH").apply(base, assoc, idGenerator())!;

    expect(result.associated.tuid).to.equal("B");
    expect(result.associated.stopTimes.map(s => s.stop_id)).to.deep.equal(["DOV", "ASH"]);
    expect(base.stopTimes.map(s => s.stop_id)).to.deep.equal(["RAM", "ASH", "TON"]);

    // a join is the other way round
    expect(result.link.from).to.equal(result.associated.id);
    expect(result.link.to).to.equal(base.id);
    expect(result.link.location).to.equal("ASH");
  });

  it("dates an overnight associated schedule on the base's service day", () => {
    const base = schedule(1, "A", "2017-07-10", "2017-07-16", STP.Overlay, ALL_DAYS, [
      stop(1, "TON", "22:30"),
      stop(2, "PDW", "23:30"),
      stop(3, "ASH", "24:30"),
      stop(4, "RAM", "25:00"),
    ]);

    const assoc = schedule(2, "B", "2017-07-11", "2017-07-17", STP.Overlay, ALL_DAYS, [
      stop(1, "ASH", "00:35"),
      stop(2, "DOV", "01:00"),
    ]);

    const result = association(base, assoc, AssociationType.Split, "ASH", DateIndicator.Next)
      .apply(base, assoc, idGenerator())!;

    // dated on the day the base left, not the day its own schedule names
    expect(result.associated.calendar.runsFrom.equals("2017-07-10")).to.be.true;
    expect(result.associated.calendar.runsTo.equals("2017-07-16")).to.be.true;
    expect(result.associated.stopTimes[0].arrival_time).to.equal("24:35");
    expect(result.associated.stopTimes[0].departure_time).to.equal("24:35:30");
    expect(result.associated.stopTimes[1].arrival_time).to.equal("25:00");
  });

  it("publishes a next day schedule on its own day as well as the base's", () => {
    const base = schedule(1, "A", "2017-07-10", "2017-07-16", STP.Overlay, ALL_DAYS, [
      stop(1, "TON", "22:08"),
      stop(2, "ASH", "23:30"),
    ]);

    // stabled overnight and away in the morning, which is the 08:41 to anyone boarding it
    const assoc = schedule(2, "B", "2017-07-11", "2017-07-17", STP.Overlay, ALL_DAYS, [
      stop(1, "ASH", "08:41"),
      stop(2, "DOV", "09:30"),
    ]);

    const result = association(base, assoc, AssociationType.Split, "ASH", DateIndicator.Next)
      .apply(base, assoc, idGenerator())!;

    // the coupling needs it on the base's day, where 08:41 has to read as 32:41
    expect(result.associated.calendar.runsFrom.equals("2017-07-10")).to.be.true;
    expect(result.associated.stopTimes[0].arrival_time).to.equal("32:41");

    // and a passenger needs it where the timetable puts it, so it is published there too
    expect(result.asDated!.calendar.runsFrom.equals("2017-07-11")).to.be.true;
    expect(result.asDated!.stopTimes[0].arrival_time).to.equal("08:41");
    // every day it runs, not only the ones it is uncoupled on
    expect(result.asDated!.calendar.runsTo.equals("2017-07-17")).to.be.true;
    expect(result.asDated!.calendar.excludeDays).to.deep.equal({});
  });

  it("does not publish it on its own day where the late night rule would put it back", () => {
    const base = schedule(1, "A", "2017-07-10", "2017-07-16", STP.Overlay, ALL_DAYS, [
      stop(1, "TON", "22:30"),
      stop(2, "ASH", "24:30"),
    ]);

    const assoc = schedule(2, "B", "2017-07-11", "2017-07-17", STP.Overlay, ALL_DAYS, [
      stop(1, "ASH", "00:35"),
      stop(2, "DOV", "01:00"),
    ]);

    const result = association(base, assoc, AssociationType.Split, "ASH", DateIndicator.Next)
      .apply(base, assoc, idGenerator())!;

    // 00:35 is published as 24:35 the day before whether we do it or addLateNightServices does, so a
    // copy on its own day would be the same trip twice
    expect(result.asDated).to.equal(null);
  });

  it("leaves a previous day associated schedule on its own service day", () => {
    const base = schedule(1, "A", "2017-07-11", "2017-07-17", STP.Overlay, ALL_DAYS, [
      stop(1, "ASH", "01:30"),
      stop(2, "TON", "02:00"),
    ]);

    // departs before the midnight the base has not reached, so there is no telling it on the base's
    // day: 21:00 is three hours before that day began
    const assoc = schedule(2, "B", "2017-07-10", "2017-07-16", STP.Overlay, ALL_DAYS, [
      stop(1, "DOV", "21:00"),
      stop(2, "ASH", "25:30"),
    ]);

    const result = association(base, assoc, AssociationType.Join, "ASH", DateIndicator.Previous)
      .apply(base, assoc, idGenerator())!;

    expect(result.associated.calendar.runsFrom.equals("2017-07-10")).to.be.true;
    expect(result.associated.stopTimes.map(s => s.arrival_time)).to.deep.equal(["21:00", "25:30"]);
  });

  it("treats a date indicator it does not know as the same day", () => {
    const base = schedule(1, "A", "2017-07-10", "2017-07-16", STP.Overlay, ALL_DAYS, [
      stop(1, "TON", "10:00"),
      stop(2, "ASH", "12:00"),
    ]);

    const assoc = schedule(2, "B", "2017-07-10", "2017-07-16", STP.Overlay, ALL_DAYS, [
      stop(1, "ASH", "12:05"),
      stop(2, "DOV", "13:00"),
    ]);

    // both sources cast the CIF field without checking it, so an unexpected value has to mean the
    // least surprising thing rather than silently mean the day before
    const result = association(base, assoc, AssociationType.Split, "ASH", "?" as DateIndicator)
      .apply(base, assoc, idGenerator())!;

    expect(result.associated.calendar.runsFrom.equals("2017-07-10")).to.be.true;
    expect(result.associated.stopTimes.map(s => s.arrival_time)).to.deep.equal(["12:05", "13:00"]);
  });

  it("couples the associated schedule only on the days all three run", () => {
    const base = schedule(1, "A", "2017-07-10", "2017-09-16", STP.Overlay, ALL_DAYS, [
      stop(1, "TON", "10:00"),
      stop(2, "ASH", "12:00"),
    ]);

    const assoc = schedule(2, "B", "2017-07-10", "2017-09-16", STP.Overlay, ALL_DAYS, [
      stop(1, "ASH", "12:05"),
      stop(2, "DOV", "13:00"),
    ]);

    const excludeDays = {
      "20170801": Temporal.PlainDate.from("2017-08-01"),
      "20170805": Temporal.PlainDate.from("2017-08-05")
    };

    const divide = new Association(
      1, base.tuid, assoc.tuid, "ASH", DateIndicator.Same, AssociationType.Split,
      new ScheduleCalendar(
        Temporal.PlainDate.from("2017-07-20"), Temporal.PlainDate.from("2017-08-16"), ALL_DAYS, excludeDays
      ),
      STP.Overlay
    );

    const result = divide.apply(base, assoc, idGenerator())!;

    expect(result.associated.calendar.runsFrom.equals("2017-07-20")).to.equal(true);
    expect(result.associated.calendar.runsTo.equals("2017-08-16")).to.equal(true);
    expect(result.associated.calendar.excludeDays).to.include.all.keys("20170801", "20170805");

    // and the rest of it still runs, unassociated
    expect(result.asDated!.tuid).to.equal("B");
    expect(result.asDated!.calendar.runsFrom.equals("2017-07-10")).to.equal(true);
    expect(result.asDated!.calendar.runsTo.equals("2017-09-16")).to.equal(true);
    expect(result.asDated!.calendar.excludeDays).to.include.all.keys("20170720", "20170816");
    expect(result.asDated!.calendar.excludeDays).to.not.have.any.keys("20170801", "20170805");
  });

  it("takes the days the two schedules agree on, not just the dates", () => {
    const base = schedule(1, "A", "2017-07-10", "2017-07-23", STP.Overlay, WEEKDAYS, [
      stop(1, "TON", "10:00"),
      stop(2, "ASH", "12:00"),
    ]);

    const assoc = schedule(2, "B", "2017-07-10", "2017-07-23", STP.Overlay, ALL_DAYS, [
      stop(1, "ASH", "12:05"),
      stop(2, "DOV", "13:00"),
    ]);

    const result = association(base, assoc, AssociationType.Split, "ASH").apply(base, assoc, idGenerator())!;

    // the base does not run at the weekend, so neither is the coupling
    expect(result.associated.calendar.days).to.deep.equal(WEEKDAYS);
    expect(result.asDated!.calendar.days).to.deep.equal(ALL_DAYS);
  });

  it("leaves nothing unassociated when the association covers every day it runs", () => {
    const base = schedule(1, "A", "2017-07-10", "2017-08-16", STP.Overlay, WEEKDAYS, [
      stop(1, "TON", "10:00"),
      stop(2, "ASH", "12:00"),
    ]);

    // starts on Saturday the 15th but only runs on weekdays
    const assoc = schedule(2, "B", "2017-07-15", "2017-08-16", STP.Overlay, WEEKDAYS, [
      stop(1, "ASH", "12:05"),
      stop(2, "DOV", "13:00"),
    ]);

    const divide = new Association(
      1, base.tuid, assoc.tuid, "ASH", DateIndicator.Same, AssociationType.Split,
      new ScheduleCalendar(Temporal.PlainDate.from("2017-07-17"), Temporal.PlainDate.from("2017-08-16"), ALL_DAYS),
      STP.Overlay
    );

    const result = divide.apply(base, assoc, idGenerator())!;

    expect(result.asDated).to.equal(null);
    expect(result.associated.calendar.isEmpty).to.equal(false);
  });

  it("does not apply where the association says neither join nor split", () => {
    const base = schedule(1, "A", "2017-07-10", "2017-07-16", STP.Overlay, ALL_DAYS, [
      stop(1, "TON", "10:00"),
      stop(2, "ASH", "12:00"),
    ]);

    const assoc = schedule(2, "B", "2017-07-10", "2017-07-16", STP.Overlay, ALL_DAYS, [
      stop(1, "ASH", "12:05"),
      stop(2, "DOV", "13:00"),
    ]);

    // every blank category in a refresh is a cancellation, which applyOverlays resolves before this
    // is reached - but the category is cast unchecked too, and a record that says nothing should not
    // be read as a join
    expect(association(base, assoc, AssociationType.NA, "ASH").apply(base, assoc, idGenerator()))
      .to.equal(null);
  });

  it("does not apply where a schedule does not call at the association location", () => {
    const base = schedule(1, "A", "2017-07-10", "2017-07-16", STP.Overlay, ALL_DAYS, [
      stop(1, "TON", "10:00"),
      stop(2, "PDW", "12:00"),
    ]);

    const assoc = schedule(2, "B", "2017-07-10", "2017-07-16", STP.Overlay, ALL_DAYS, [
      stop(1, "ASH", "12:05"),
      stop(2, "DOV", "13:00"),
    ]);

    expect(association(base, assoc, AssociationType.Split, "ASH").apply(base, assoc, idGenerator())).to.equal(null);
  });

  it("does not apply where there is no day both run and the association is in force", () => {
    const base = schedule(1, "A", "2017-07-10", "2017-07-16", STP.Overlay, ALL_DAYS, [
      stop(1, "TON", "10:00"),
      stop(2, "ASH", "12:00"),
    ]);

    const assoc = schedule(2, "B", "2017-09-10", "2017-09-16", STP.Overlay, ALL_DAYS, [
      stop(1, "ASH", "12:05"),
      stop(2, "DOV", "13:00"),
    ]);

    const divide = new Association(
      1, base.tuid, assoc.tuid, "ASH", DateIndicator.Same, AssociationType.Split, base.calendar, STP.Overlay
    );

    expect(divide.apply(base, assoc, idGenerator())).to.equal(null);
  });

  it("cancels only the association at the location the cancellation names", () => {
    const calendar = new ScheduleCalendar(
      Temporal.PlainDate.from("2026-12-14"), Temporal.PlainDate.from("2027-05-13"), ALL_DAYS
    );

    const divideAtBarnham = new Association(
      1, "A", "B", "BAA", DateIndicator.Same, AssociationType.Split, calendar, STP.Permanent
    );
    const divideAtHorsham = new Association(
      2, "A", "B", "HRH", DateIndicator.Same, AssociationType.Split, calendar, STP.Permanent
    );
    const cancelAtBarnham = new Association(
      3, "A", "B", "BAA", DateIndicator.Same, AssociationType.NA, calendar, STP.Cancellation
    );

    const index = applyOverlays([divideAtBarnham, divideAtHorsham, cancelAtBarnham]);
    const surviving = Object.values(index).flat();

    expect(surviving).to.have.length(1);
    expect(surviving[0].assocLocation).to.equal("HRH");
  });

});

const ALL_DAYS: Days = { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 };
const WEEKDAYS: Days = { 0: 0, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 0 };

function stop(stopSequence: number, location: CRS, time: string, tripId: string = "Z00000_20270101_20270101"): StopTime {
  return {
    trip_id: tripId,
    arrival_time: time,
    departure_time: time + ":30",
    stop_id: location,
    stop_sequence: stopSequence,
    stop_headsign: null,
    pickup_type: PickupDropOffType.SCHEDULED,
    drop_off_type: PickupDropOffType.SCHEDULED,
    shape_dist_traveled: null,
    timepoint: 0,
    platform: null,
    tiploc: null,
  };
}

function association(base: Schedule,
                     assoc: Schedule,
                     type: AssociationType,
                     location: CRS,
                     dateIndicator: DateIndicator = DateIndicator.Same): Association {
  return new Association(
    1,
    base.tuid,
    assoc.tuid,
    location,
    dateIndicator,
    type,
    base.calendar,
    STP.Overlay
  );
}

function *idGenerator(): IterableIterator<number> {
  let id = 100;
  while (true) {
    yield id++;
  }
}
