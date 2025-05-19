import * as chai from "chai";
import * as moment from "moment";
import {Days, ScheduleCalendar} from "../../../src/gtfs/native/ScheduleCalendar";
import {STP, TUID} from "../../../src/gtfs/native/OverlayRecord";
import {StopTime} from "../../../src/gtfs/file/StopTime";
import {CRS} from "../../../src/gtfs/file/Stop";
import {Association, AssociationType, DateIndicator} from "../../../src/gtfs/native/Association";
import {applyAssociations, AssociationIndex, ScheduleIndex} from "../../../src/gtfs/command/ApplyAssociations";
import {applyOverlays} from "../../../src/gtfs/command/ApplyOverlays";
import {schedule} from "./MergeSchedules.spec";

describe("ApplyAssociations", () => {

  it("matches the correct base schedule", () => {
    const base1 = schedule(1, "A", "2017-07-10", "2017-07-10", STP.Overlay, ALL_DAYS, [
      stop(1, "TON", "22:30"),
      stop(2, "PDW", "23:30"),
      stop(3, "ASH", "24:30"),
      stop(4, "RAM", "25:00"),
    ]);

    const assoc1 = schedule(1, "B", "2017-07-11", "2017-07-11", STP.Overlay, ALL_DAYS, [
      stop(1, "ASH", "00:35"),
      stop(2, "DOV", "01:00"),
    ]);

    const base2 = schedule(1, "A", "2017-07-11", "2017-07-11", STP.Overlay, ALL_DAYS, [
      stop(1, "TON", "22:30"),
      stop(2, "ASH", "24:30"),
      stop(3, "RAM", "25:00"),
    ]);

    const assoc2 = schedule(1, "B", "2017-07-12", "2017-07-12", STP.Overlay, ALL_DAYS, [
      stop(1, "ASH", "00:35"),
      stop(2, "DOV", "01:00"),
      stop(3, "SEA", "01:30"),
    ]);

    // create an association record that spans both base1, base2 and assoc1, assoc2
    const calendar = new ScheduleCalendar(moment("2017-07-01"), moment("2017-07-31"), ALL_DAYS);
    const association1 = association("A", "B", AssociationType.Split, "ASH", DateIndicator.Next, calendar);

    const resultByTuid = applyAssociations(
      applyOverlays([base1, assoc1, base2, assoc2]) as ScheduleIndex,
      applyOverlays([association1]) as AssociationIndex,
      idGenerator()
    );

    const [result1, result2, other] = resultByTuid["A_B"];

    // make sure that it only matches base1 to assoc1 and base2 to assoc2
    chai.expect(result1.tuid).to.equal("A_B");
    chai.expect(result1.calendar.runsFrom.isSame("2017-07-10")).to.be.true;
    chai.expect(result1.calendar.runsTo.isSame("2017-07-10")).to.be.true;
    chai.expect(result1.stopTimes[0].stop_id).to.equal("TON");
    chai.expect(result1.stopTimes[0].stop_sequence).to.equal(1);
    chai.expect(result1.stopTimes[1].stop_id).to.equal("PDW");
    chai.expect(result1.stopTimes[1].stop_sequence).to.equal(2);
    chai.expect(result1.stopTimes[2].stop_id).to.equal("ASH");
    chai.expect(result1.stopTimes[2].stop_sequence).to.equal(3);
    chai.expect(result1.stopTimes[2].departure_time).to.equal("24:35:00");
    chai.expect(result1.stopTimes[3].stop_id).to.equal("DOV");
    chai.expect(result1.stopTimes[3].stop_sequence).to.equal(4);
    chai.expect(result1.stopTimes[3].departure_time).to.equal("25:00:00");
    chai.expect(result2.tuid).to.equal("A_B");
    chai.expect(result2.calendar.runsFrom.isSame("2017-07-11")).to.be.true;
    chai.expect(result2.calendar.runsTo.isSame("2017-07-11")).to.be.true;
    chai.expect(result2.stopTimes[0].stop_id).to.equal("TON");
    chai.expect(result2.stopTimes[0].stop_sequence).to.equal(1);
    chai.expect(result2.stopTimes[1].stop_id).to.equal("ASH");
    chai.expect(result2.stopTimes[1].stop_sequence).to.equal(2);
    chai.expect(result2.stopTimes[1].departure_time).to.equal("24:35:00");
    chai.expect(result2.stopTimes[2].stop_id).to.equal("DOV");
    chai.expect(result2.stopTimes[2].stop_sequence).to.equal(3);
    chai.expect(result2.stopTimes[2].departure_time).to.equal("25:00:00");
    chai.expect(result2.stopTimes[3].stop_id).to.equal("SEA");
    chai.expect(result2.stopTimes[3].stop_sequence).to.equal(4);
    chai.expect(result2.stopTimes[3].departure_time).to.equal("25:30:00");
    chai.expect(other).to.be.undefined;
  });

});

const ALL_DAYS: Days = { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 };


export function stop(stopSequence: number, location: CRS, time: string): StopTime {
  return {
    trip_id: 1,
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
  let id = 0;
  while (true) {
    yield id++;
  }
}
