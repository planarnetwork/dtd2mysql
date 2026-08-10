import {describe, expect, it} from 'vitest';
import {Days, ScheduleCalendar} from "../../src/model/ScheduleCalendar";
import {STP} from "../../src/model/OverlayRecord";
import {StopTime} from "../../src/entity/StopTime";
import {Schedule} from "../../src/model/Schedule";
import {CRS} from "../../src/entity/Stop";
import {Association, AssociationType, DateIndicator} from "../../src/model/Association";
import {applyOverlays} from "../../src/transform/ApplyOverlays";
import {schedule} from "../transform/MergeSchedules.spec";

describe("Association", () => {

  it("applies splits", () => {
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

    const [result] = association(base, assoc, AssociationType.Split, "ASH").apply(base, assoc, idGenerator());

    expect(result.tuid).to.equal("A_B");
    expect(result.stopTimes[0].stop_id).to.equal("TON");
    expect(result.stopTimes[0].stop_sequence).to.equal(1);
    expect(result.stopTimes[1].stop_id).to.equal("PDW");
    expect(result.stopTimes[1].stop_sequence).to.equal(2);
    expect(result.stopTimes[2].stop_id).to.equal("ASH");
    expect(result.stopTimes[2].stop_sequence).to.equal(3);
    expect(result.stopTimes[2].arrival_time).to.equal("12:00:00");
    expect(result.stopTimes[2].departure_time).to.equal("12:05:00");
    expect(result.stopTimes[3].stop_id).to.equal("DOV");
    expect(result.stopTimes[3].stop_sequence).to.equal(4);
  });

  it("re-sequences splits", () => {
    const base = schedule(1, "A", "2017-07-10", "2017-07-16", STP.Overlay, ALL_DAYS, [
      stop(1, "PDW", "11:00"),
      stop(3, "ASH", "12:00"),
      stop(5, "RAM", "13:00"),
    ]);

    const assoc = schedule(2, "B", "2017-07-10", "2017-07-16", STP.Overlay, ALL_DAYS, [
      stop(1, "ASH", "12:05", 2),
      stop(3, "DOV", "13:00", 2),
      stop(5, "A", "13:20", 2),
      stop(7, "B", "13:40", 2),
    ]);

    const [result] = association(base, assoc, AssociationType.Split, "ASH").apply(base, assoc, idGenerator());

    expect(result.tuid).to.equal("A_B");
    expect(result.stopTimes[0].stop_id).to.equal("PDW");
    expect(result.stopTimes[0].stop_sequence).to.equal(1);
    expect(result.stopTimes[0].trip_id).to.equal("A_B_20170710_20170716");
    expect(result.stopTimes[1].stop_id).to.equal("ASH");
    expect(result.stopTimes[1].stop_sequence).to.equal(2);
    expect(result.stopTimes[1].trip_id).to.equal("A_B_20170710_20170716");
    expect(result.stopTimes[2].stop_id).to.equal("DOV");
    expect(result.stopTimes[2].stop_sequence).to.equal(3);
    expect(result.stopTimes[2].trip_id).to.equal("A_B_20170710_20170716");
    expect(result.stopTimes[3].stop_id).to.equal("A");
    expect(result.stopTimes[3].stop_sequence).to.equal(4);
    expect(result.stopTimes[3].trip_id).to.equal("A_B_20170710_20170716");
    expect(result.stopTimes[4].stop_id).to.equal("B");
    expect(result.stopTimes[4].stop_sequence).to.equal(5);
    expect(result.stopTimes[4].trip_id).to.equal("A_B_20170710_20170716");
  });

  it("applies overnight splits", () => {
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

    const [result] = association(base, assoc, AssociationType.Split, "ASH", DateIndicator.Next).apply(base, assoc, idGenerator());

    expect(result.tuid).to.equal("A_B");
    expect(result.calendar.runsFrom.equals("2017-07-10")).to.be.true;
    expect(result.calendar.runsTo.equals("2017-07-16")).to.be.true;
    expect(result.stopTimes[0].stop_id).to.equal("TON");
    expect(result.stopTimes[0].stop_sequence).to.equal(1);
    expect(result.stopTimes[1].stop_id).to.equal("PDW");
    expect(result.stopTimes[1].stop_sequence).to.equal(2);
    expect(result.stopTimes[2].stop_id).to.equal("ASH");
    expect(result.stopTimes[2].stop_sequence).to.equal(3);
    expect(result.stopTimes[2].arrival_time).to.equal("24:30:00");
    expect(result.stopTimes[2].departure_time).to.equal("24:35:00");
    expect(result.stopTimes[3].stop_id).to.equal("DOV");
    expect(result.stopTimes[3].stop_sequence).to.equal(4);
    expect(result.stopTimes[3].departure_time).to.equal("25:00:00");
  });

  it("takes the correct departure time for splits", () => {
    const base = schedule(1, "A", "2017-07-10", "2017-07-16", STP.Overlay, ALL_DAYS, [
      stop(1, "TON", "10:00"),
      stop(2, "PDW", "11:00"),
      stop(3, "ASH", "12:00"),
      stop(4, "RAM", "13:00"),
    ]);

    const assoc = schedule(2, "B", "2017-07-10", "2017-07-16", STP.Overlay, ALL_DAYS, [
      stop(1, "ASH", "11:59"),
      stop(2, "DOV", "13:00"),
    ]);

    const [result] = association(base, assoc, AssociationType.Split, "ASH").apply(base, assoc, idGenerator());

    expect(result.tuid).to.equal("A_B");
    expect(result.stopTimes[0].stop_id).to.equal("TON");
    expect(result.stopTimes[0].stop_sequence).to.equal(1);
    expect(result.stopTimes[1].stop_id).to.equal("PDW");
    expect(result.stopTimes[1].stop_sequence).to.equal(2);
    expect(result.stopTimes[2].stop_id).to.equal("ASH");
    expect(result.stopTimes[2].stop_sequence).to.equal(3);
    expect(result.stopTimes[2].arrival_time).to.equal("11:59:00");
    expect(result.stopTimes[2].departure_time).to.equal("11:59:00");
    expect(result.stopTimes[3].stop_id).to.equal("DOV");
    expect(result.stopTimes[3].stop_sequence).to.equal(4);
  });

  it("applies joins", () => {
    const base = schedule(1, "A", "2017-07-10", "2017-07-16", STP.Overlay, ALL_DAYS, [
      stop(1, "RAM", "10:00"),
      stop(3, "CBW", "11:00"),
      stop(5, "ASH", "12:00"),
      stop(7, "PDW", "13:00"),
      stop(9, "TON", "14:00"),
    ]);

    const assoc = schedule(2, "B", "2017-07-10", "2017-07-16", STP.Overlay, ALL_DAYS, [
      stop(1, "DOV", "11:00"),
      stop(3, "ASH", "11:55"),
    ]);

    const [result] = association(base, assoc, AssociationType.Join, "ASH").apply(base, assoc, idGenerator());

    expect(result.tuid).to.equal("B_A");
    expect(result.stopTimes[0].stop_id).to.equal("DOV");
    expect(result.stopTimes[0].stop_sequence).to.equal(1);
    expect(result.stopTimes[1].stop_id).to.equal("ASH");
    expect(result.stopTimes[1].stop_sequence).to.equal(2);
    expect(result.stopTimes[1].arrival_time).to.equal("11:55:00");
    expect(result.stopTimes[1].departure_time).to.equal("12:00:00");
    expect(result.stopTimes[2].stop_id).to.equal("PDW");
    expect(result.stopTimes[2].stop_sequence).to.equal(3);
    expect(result.stopTimes[3].stop_id).to.equal("TON");
    expect(result.stopTimes[3].stop_sequence).to.equal(4);
  });

  it("re-sequences applies joins", () => {
    const base = schedule(1, "A", "2017-07-10", "2017-07-16", STP.Overlay, ALL_DAYS, [
      stop(1, "CBW", "11:00"),
      stop(3, "ASH", "12:00"),
      stop(5, "PDW", "13:00"),
      stop(7, "TON", "14:00"),
    ]);

    const assoc = schedule(2, "B", "2017-07-10", "2017-07-16", STP.Overlay, ALL_DAYS, [
      stop(1, "A", "10:00", 2),
      stop(3, "B", "10:20", 2),
      stop(5, "C", "10:40", 2),
      stop(7, "DOV", "11:00", 2),
      stop(9, "ASH", "11:55", 2),
    ]);

    const [result] = association(base, assoc, AssociationType.Join, "ASH").apply(base, assoc, idGenerator());

    expect(result.tuid).to.equal("B_A");
    expect(result.stopTimes[0].stop_id).to.equal("A");
    expect(result.stopTimes[0].stop_sequence).to.equal(1);
    expect(result.stopTimes[0].trip_id).to.equal("B_A_20170710_20170716");
    expect(result.stopTimes[1].stop_id).to.equal("B");
    expect(result.stopTimes[1].stop_sequence).to.equal(2);
    expect(result.stopTimes[1].trip_id).to.equal("B_A_20170710_20170716");
    expect(result.stopTimes[2].stop_id).to.equal("C");
    expect(result.stopTimes[2].stop_sequence).to.equal(3);
    expect(result.stopTimes[2].trip_id).to.equal("B_A_20170710_20170716");
    expect(result.stopTimes[3].stop_id).to.equal("DOV");
    expect(result.stopTimes[3].stop_sequence).to.equal(4);
    expect(result.stopTimes[3].trip_id).to.equal("B_A_20170710_20170716");
    expect(result.stopTimes[4].stop_id).to.equal("ASH");
    expect(result.stopTimes[4].stop_sequence).to.equal(5);
    expect(result.stopTimes[4].trip_id).to.equal("B_A_20170710_20170716");
    expect(result.stopTimes[5].stop_id).to.equal("PDW");
    expect(result.stopTimes[5].stop_sequence).to.equal(6);
    expect(result.stopTimes[5].trip_id).to.equal("B_A_20170710_20170716");
    expect(result.stopTimes[6].stop_id).to.equal("TON");
    expect(result.stopTimes[6].stop_sequence).to.equal(7);
    expect(result.stopTimes[6].trip_id).to.equal("B_A_20170710_20170716");
  });

  it("takes the correct departure time for joins", () => {
    const base = schedule(1, "A", "2017-07-10", "2017-07-16", STP.Overlay, ALL_DAYS, [
      stop(1, "RAM", "10:00"),
      stop(3, "CBW", "11:00"),
      stop(5, "ASH", "11:50"),
      stop(7, "PDW", "13:00"),
      stop(9, "TON", "14:00"),
    ]);

    const assoc = schedule(2, "B", "2017-07-10", "2017-07-16", STP.Overlay, ALL_DAYS, [
      stop(1, "DOV", "11:00"),
      stop(3, "ASH", "11:55"),
    ]);

    const [result] = association(base, assoc, AssociationType.Join, "ASH").apply(base, assoc, idGenerator());

    expect(result.tuid).to.equal("B_A");
    expect(result.stopTimes[0].stop_id).to.equal("DOV");
    expect(result.stopTimes[0].stop_sequence).to.equal(1);
    expect(result.stopTimes[1].stop_id).to.equal("ASH");
    expect(result.stopTimes[1].stop_sequence).to.equal(2);
    expect(result.stopTimes[1].arrival_time).to.equal("11:50:00");
    expect(result.stopTimes[1].departure_time).to.equal("11:50:00");
    expect(result.stopTimes[2].stop_id).to.equal("PDW");
    expect(result.stopTimes[2].stop_sequence).to.equal(3);
    expect(result.stopTimes[3].stop_id).to.equal("TON");
    expect(result.stopTimes[3].stop_sequence).to.equal(4);
  });

  it("creates a copy of the associated schedule where the association does not apply", () => {
    const base = schedule(1, "A", "2017-07-10", "2017-09-16", STP.Overlay, ALL_DAYS, [
      stop(1, "TON", "10:00"),
      stop(2, "PDW", "11:00"),
      stop(3, "ASH", "12:00"),
      stop(4, "RAM", "13:00"),
    ]);

    const assoc = schedule(2, "B", "2017-07-10", "2017-09-16", STP.Overlay, ALL_DAYS, [
      stop(1, "ASH", "12:05"),
      stop(2, "DOV", "13:00"),
    ]);

    const excludeDays = {
      "20170801": Temporal.PlainDate.from("2017-08-01"),
      "20170805": Temporal.PlainDate.from("2017-08-05")
    };

    const association1 = new Association(
      1,
      base.tuid,
      assoc.tuid,
      "ASH",
      DateIndicator.Same,
      AssociationType.Split,
      new ScheduleCalendar(Temporal.PlainDate.from("2017-07-20"), Temporal.PlainDate.from("2017-08-16"), ALL_DAYS, excludeDays),
      STP.Overlay
    );

    const [result, other] = association1.apply(base, assoc, idGenerator());

    expect(result.tuid).to.equal("A_B");
    expect(result.calendar.runsFrom.equals("2017-07-20")).to.equal(true);
    expect(result.calendar.runsTo.equals("2017-08-16")).to.equal(true);
    expect(other.tuid).to.equal("B");
    expect(other.calendar.runsFrom.equals("2017-07-10")).to.equal(true);
    expect(other.calendar.runsTo.equals("2017-09-16")).to.equal(true);
    expect(other.calendar.excludeDays).to.include.all.keys("20170720", "20170816");
    expect(other.calendar.excludeDays).to.not.have.any.keys("20170801", "20170805");

    expect(result.calendar.excludeDays).to.include.all.keys("20170801", "20170805");
  });

  it("keeps the stop time trip ID in step with the calendar for previous day associations", () => {
    const base = schedule(1, "A", "2017-07-10", "2017-07-16", STP.Overlay, ALL_DAYS, [
      stop(1, "TON", "10:00"),
      stop(2, "ASH", "12:00"),
    ]);

    const assoc = schedule(2, "B", "2017-07-10", "2017-07-16", STP.Overlay, ALL_DAYS, [
      stop(1, "ASH", "12:05"),
      stop(2, "DOV", "13:00"),
    ]);

    const association1 = association(base, assoc, AssociationType.Split, "ASH", DateIndicator.Previous);
    const [result] = association1.apply(base, assoc, idGenerator());

    expect(result.stopTimes[0].trip_id).to.equal(result.tripId);
  });

  it("does not create a copy of the associated schedule for dates when it does not run", () => {
    const base = schedule(1, "A", "2017-07-10", "2017-08-16", STP.Overlay, WEEKDAYS, [
      stop(1, "TON", "10:00"),
      stop(2, "PDW", "11:00"),
      stop(3, "ASH", "12:00"),
      stop(4, "RAM", "13:00"),
    ]);

    // starts on Saturday the 15th but only runs on weekdays
    const assoc = schedule(2, "B", "2017-07-15", "2017-08-16", STP.Overlay, WEEKDAYS, [
      stop(1, "ASH", "12:05"),
      stop(2, "DOV", "13:00"),
    ]);

    const association1 = new Association(
      1,
      base.tuid,
      assoc.tuid,
      "ASH",
      DateIndicator.Same,
      AssociationType.Split,
      new ScheduleCalendar(Temporal.PlainDate.from("2017-07-17"), Temporal.PlainDate.from("2017-08-16"), ALL_DAYS),
      STP.Overlay
    );

    // no copy is created for the 15th and 16th as the associated schedule does not run on those days
    const results = association1.apply(base, assoc, idGenerator());

    expect(results).to.have.length(1);
    expect(results[0].tuid).to.equal("A_B");
    expect(results[0].calendar.isEmpty).to.equal(false);
  });

  it("does not create a schedule for exclude days when the associated schedule does not run", () => {
    const base = schedule(1, "A", "2017-07-10", "2017-07-21", STP.Overlay, WEEKDAYS, [
      stop(1, "TON", "10:00"),
      stop(2, "PDW", "11:00"),
      stop(3, "ASH", "12:00"),
      stop(4, "RAM", "13:00"),
    ]);

    const assoc = schedule(2, "B", "2017-07-10", "2017-07-21", STP.Overlay, WEEKDAYS, [
      stop(1, "ASH", "12:05"),
      stop(2, "DOV", "13:00"),
    ]);

    // the association does not apply on Sunday the 16th, a day the associated schedule does not run anyway
    const association1 = new Association(
      1,
      base.tuid,
      assoc.tuid,
      "ASH",
      DateIndicator.Same,
      AssociationType.Split,
      new ScheduleCalendar(Temporal.PlainDate.from("2017-07-10"), Temporal.PlainDate.from("2017-07-21"), ALL_DAYS, { "20170716": Temporal.PlainDate.from("2017-07-16") }),
      STP.Overlay
    );

    const results = association1.apply(base, assoc, idGenerator());

    expect(results).to.have.length(1);
    expect(results[0].tuid).to.equal("A_B");
    expect(results[0].calendar.isEmpty).to.equal(false);
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
    stop_headsign: "",
    pickup_type: 0,
    drop_off_type: 0,
    shape_dist_traveled: null,
    timepoint: 0,
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
  let id = 0;
  while (true) {
    yield id++;
  }
}
