import * as chai from "chai";
import * as moment from "moment";
import {Days, ScheduleCalendar} from "../../../src/gtfs/native/ScheduleCalendar";
import {STP} from "../../../src/gtfs/native/OverlayRecord";
import {StopTime} from "../../../src/gtfs/file/StopTime";
import {Schedule} from "../../../src/gtfs/native/Schedule";
import {CRS} from "../../../src/gtfs/file/Stop";
import {Association, AssociationType, DateIndicator} from "../../../src/gtfs/native/Association";
import {schedule} from "../command/MergeSchedules.spec";

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

    chai.expect(result.tuid).to.equal("A_B");
    chai.expect(result.stopTimes[0].stop_id).to.equal("TON");
    chai.expect(result.stopTimes[0].stop_sequence).to.equal(1);
    chai.expect(result.stopTimes[1].stop_id).to.equal("PDW");
    chai.expect(result.stopTimes[1].stop_sequence).to.equal(2);
    chai.expect(result.stopTimes[2].stop_id).to.equal("ASH");
    chai.expect(result.stopTimes[2].stop_sequence).to.equal(3);
    chai.expect(result.stopTimes[2].arrival_time).to.equal("12:00:00");
    chai.expect(result.stopTimes[2].departure_time).to.equal("12:05:00");
    chai.expect(result.stopTimes[3].stop_id).to.equal("DOV");
    chai.expect(result.stopTimes[3].stop_sequence).to.equal(4);
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

    chai.expect(result.tuid).to.equal("A_B");
    chai.expect(result.stopTimes[0].stop_id).to.equal("PDW");
    chai.expect(result.stopTimes[0].stop_sequence).to.equal(1);
    chai.expect(result.stopTimes[0].trip_id).to.equal(2);
    chai.expect(result.stopTimes[1].stop_id).to.equal("ASH");
    chai.expect(result.stopTimes[1].stop_sequence).to.equal(2);
    chai.expect(result.stopTimes[1].trip_id).to.equal(2);
    chai.expect(result.stopTimes[2].stop_id).to.equal("DOV");
    chai.expect(result.stopTimes[2].stop_sequence).to.equal(3);
    chai.expect(result.stopTimes[2].trip_id).to.equal(2);
    chai.expect(result.stopTimes[3].stop_id).to.equal("A");
    chai.expect(result.stopTimes[3].stop_sequence).to.equal(4);
    chai.expect(result.stopTimes[3].trip_id).to.equal(2);
    chai.expect(result.stopTimes[4].stop_id).to.equal("B");
    chai.expect(result.stopTimes[4].stop_sequence).to.equal(5);
    chai.expect(result.stopTimes[4].trip_id).to.equal(2);
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

    chai.expect(result.tuid).to.equal("A_B");
    chai.expect(result.calendar.runsFrom.isSame("2017-07-10")).to.be.true;
    chai.expect(result.calendar.runsTo.isSame("2017-07-16")).to.be.true;
    chai.expect(result.stopTimes[0].stop_id).to.equal("TON");
    chai.expect(result.stopTimes[0].stop_sequence).to.equal(1);
    chai.expect(result.stopTimes[1].stop_id).to.equal("PDW");
    chai.expect(result.stopTimes[1].stop_sequence).to.equal(2);
    chai.expect(result.stopTimes[2].stop_id).to.equal("ASH");
    chai.expect(result.stopTimes[2].stop_sequence).to.equal(3);
    chai.expect(result.stopTimes[2].arrival_time).to.equal("24:30:00");
    chai.expect(result.stopTimes[2].departure_time).to.equal("24:35:00");
    chai.expect(result.stopTimes[3].stop_id).to.equal("DOV");
    chai.expect(result.stopTimes[3].stop_sequence).to.equal(4);
    chai.expect(result.stopTimes[3].departure_time).to.equal("25:00:00");
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

    chai.expect(result.tuid).to.equal("A_B");
    chai.expect(result.stopTimes[0].stop_id).to.equal("TON");
    chai.expect(result.stopTimes[0].stop_sequence).to.equal(1);
    chai.expect(result.stopTimes[1].stop_id).to.equal("PDW");
    chai.expect(result.stopTimes[1].stop_sequence).to.equal(2);
    chai.expect(result.stopTimes[2].stop_id).to.equal("ASH");
    chai.expect(result.stopTimes[2].stop_sequence).to.equal(3);
    chai.expect(result.stopTimes[2].arrival_time).to.equal("11:59:00");
    chai.expect(result.stopTimes[2].departure_time).to.equal("11:59:00");
    chai.expect(result.stopTimes[3].stop_id).to.equal("DOV");
    chai.expect(result.stopTimes[3].stop_sequence).to.equal(4);
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

    chai.expect(result.tuid).to.equal("B_A");
    chai.expect(result.stopTimes[0].stop_id).to.equal("DOV");
    chai.expect(result.stopTimes[0].stop_sequence).to.equal(1);
    chai.expect(result.stopTimes[1].stop_id).to.equal("ASH");
    chai.expect(result.stopTimes[1].stop_sequence).to.equal(2);
    chai.expect(result.stopTimes[1].arrival_time).to.equal("11:55:00");
    chai.expect(result.stopTimes[1].departure_time).to.equal("12:00:00");
    chai.expect(result.stopTimes[2].stop_id).to.equal("PDW");
    chai.expect(result.stopTimes[2].stop_sequence).to.equal(3);
    chai.expect(result.stopTimes[3].stop_id).to.equal("TON");
    chai.expect(result.stopTimes[3].stop_sequence).to.equal(4);
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

    chai.expect(result.tuid).to.equal("B_A");
    chai.expect(result.stopTimes[0].stop_id).to.equal("A");
    chai.expect(result.stopTimes[0].stop_sequence).to.equal(1);
    chai.expect(result.stopTimes[0].trip_id).to.equal(2);
    chai.expect(result.stopTimes[1].stop_id).to.equal("B");
    chai.expect(result.stopTimes[1].stop_sequence).to.equal(2);
    chai.expect(result.stopTimes[1].trip_id).to.equal(2);
    chai.expect(result.stopTimes[2].stop_id).to.equal("C");
    chai.expect(result.stopTimes[2].stop_sequence).to.equal(3);
    chai.expect(result.stopTimes[2].trip_id).to.equal(2);
    chai.expect(result.stopTimes[3].stop_id).to.equal("DOV");
    chai.expect(result.stopTimes[3].stop_sequence).to.equal(4);
    chai.expect(result.stopTimes[3].trip_id).to.equal(2);
    chai.expect(result.stopTimes[4].stop_id).to.equal("ASH");
    chai.expect(result.stopTimes[4].stop_sequence).to.equal(5);
    chai.expect(result.stopTimes[4].trip_id).to.equal(2);
    chai.expect(result.stopTimes[5].stop_id).to.equal("PDW");
    chai.expect(result.stopTimes[5].stop_sequence).to.equal(6);
    chai.expect(result.stopTimes[5].trip_id).to.equal(2);
    chai.expect(result.stopTimes[6].stop_id).to.equal("TON");
    chai.expect(result.stopTimes[6].stop_sequence).to.equal(7);
    chai.expect(result.stopTimes[6].trip_id).to.equal(2);
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

    chai.expect(result.tuid).to.equal("B_A");
    chai.expect(result.stopTimes[0].stop_id).to.equal("DOV");
    chai.expect(result.stopTimes[0].stop_sequence).to.equal(1);
    chai.expect(result.stopTimes[1].stop_id).to.equal("ASH");
    chai.expect(result.stopTimes[1].stop_sequence).to.equal(2);
    chai.expect(result.stopTimes[1].arrival_time).to.equal("11:50:00");
    chai.expect(result.stopTimes[1].departure_time).to.equal("11:50:00");
    chai.expect(result.stopTimes[2].stop_id).to.equal("PDW");
    chai.expect(result.stopTimes[2].stop_sequence).to.equal(3);
    chai.expect(result.stopTimes[3].stop_id).to.equal("TON");
    chai.expect(result.stopTimes[3].stop_sequence).to.equal(4);
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
      "20170801": moment("2017-08-01"),
      "20170805": moment("2017-08-05")
    };

    const association1 = new Association(
      1,
      base.tuid,
      assoc.tuid,
      "ASH",
      DateIndicator.Same,
      AssociationType.Split,
      new ScheduleCalendar(moment("2017-07-20"), moment("2017-08-16"), ALL_DAYS, excludeDays),
      STP.Overlay
    );

    const [result, before, after, ex1, ex2] = association1.apply(base, assoc, idGenerator());

    chai.expect(result.tuid).to.equal("A_B");
    chai.expect(result.calendar.runsFrom.isSame("2017-07-20")).to.equal(true);
    chai.expect(result.calendar.runsTo.isSame("2017-08-16")).to.equal(true);
    chai.expect(before.tuid).to.equal("B");
    chai.expect(before.calendar.runsFrom.isSame("2017-07-10")).to.equal(true);
    chai.expect(before.calendar.runsTo.isSame("2017-07-19")).to.equal(true);
    chai.expect(after.tuid).to.equal("B");
    chai.expect(after.calendar.runsFrom.isSame("2017-08-17")).to.equal(true);
    chai.expect(after.calendar.runsTo.isSame("2017-09-16")).to.equal(true);
    chai.expect(ex1.tuid).to.equal("B");
    chai.expect(ex1.calendar.runsFrom.isSame("2017-08-01")).to.equal(true);
    chai.expect(ex1.calendar.runsTo.isSame("2017-08-01")).to.equal(true);
    chai.expect(ex2.tuid).to.equal("B");
    chai.expect(ex2.calendar.runsFrom.isSame("2017-08-05")).to.equal(true);
    chai.expect(ex2.calendar.runsTo.isSame("2017-08-05")).to.equal(true);
  });

});

const ALL_DAYS: Days = { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 };

function stop(stopSequence: number, location: CRS, time: string, tripId: number = 1): StopTime {
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
