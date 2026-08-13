import {describe, expect, it} from 'vitest';
import {STP} from "../model/OverlayRecord";
import {Days, ScheduleCalendar} from "../model/ScheduleCalendar";
import {schedule} from "../transform/MergeSchedules.spec";
import {StopTime} from "../entity/StopTime";

describe("Schedule", () => {

  it("does not share stop times with its clones", () => {
    const original = schedule(1, "A", "2017-01-01", "2017-01-31", STP.Permanent, ALL_DAYS, [
      stop("AAA", "00:30")
    ]);

    const clone = original.clone(original.calendar.shiftBackward(), 2);
    clone.stopTimes[0].departure_time = "24:30";

    expect(original.stopTimes[0].departure_time).to.equal("00:30");
  });

  it("identifies a trip by TUID, STP indicator and date range", () => {
    const permanent = schedule(1, "A", "2017-01-01", "2017-01-31", STP.Permanent);
    const overlay = schedule(2, "A", "2017-01-01", "2017-01-31", STP.Overlay);

    expect(permanent.tripId).to.equal("A_20170101_20170131");
    expect(overlay.tripId).to.equal("A_20170101_20170131");
  });

});

const ALL_DAYS: Days = { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 };

function stop(stopId: string, time: string): StopTime {
  return {
    trip_id: "A_20170101_20170131",
    arrival_time: time,
    departure_time: time,
    stop_id: stopId,
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
