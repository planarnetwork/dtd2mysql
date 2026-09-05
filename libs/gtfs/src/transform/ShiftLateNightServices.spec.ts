import {describe, it, expect} from 'vitest';
import {STP} from "../model/OverlayRecord";
import {schedule} from "./MergeSchedules.spec";
import {stop} from "./ApplyAssociations.spec";
import {shiftLateNightServices} from "./ShiftLateNightServices";
import {Days} from "../model/ScheduleCalendar";

describe("ShiftLateNightServices", () => {
  const WEEK_DAYS: Days = { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 0, 6: 0 };

  it("shifts schedules depending on the origin departure time", () => {
    const baseSchedules = [
      schedule(1, "A", "2018-10-01", "2018-10-31", STP.Permanent, WEEK_DAYS, [
        stop(1, "TON", "01:30"),
        stop(2, "PDW", "01:40"),
        stop(3, "ASH", "01:50")
      ]),
      schedule(2, "B", "2018-10-01", "2018-10-31", STP.Permanent, WEEK_DAYS, [
        stop(1, "TON", "02:30"),
        stop(2, "PDW", "02:40"),
        stop(3, "ASH", "02:50")
      ]),
    ];

    const schedules = shiftLateNightServices(baseSchedules);

    expect(schedules[0].calendar.runsFrom.equals("20180930")).to.be.true;
    expect(schedules[0].calendar.runsTo.equals("20181030")).to.be.true;
    expect(schedules[0].calendar.days[0]).to.equal(1);
    expect(schedules[0].calendar.days[1]).to.equal(1);
    expect(schedules[0].calendar.days[2]).to.equal(1);
    expect(schedules[0].calendar.days[3]).to.equal(1);
    expect(schedules[0].calendar.days[4]).to.equal(0);
    expect(schedules[0].calendar.days[5]).to.equal(0);

    expect(schedules[0].calendar.days[6]).to.equal(1);
    expect(schedules[1].calendar.runsFrom.equals("20181001")).to.be.true;
    expect(schedules[1].calendar.runsTo.equals("20181031")).to.be.true;
  });

  /**
   * A schedule with no stop times reaches here when the feed contains a schedule with no
   * associated stop time records. Reading stopTimes[0] threw and aborted the whole build.
   */
  it("passes through a schedule with no stop times", () => {
    const baseSchedules = [
      schedule(1, "A", "2018-10-01", "2018-10-31", STP.Permanent, WEEK_DAYS, []),
      schedule(2, "B", "2018-10-01", "2018-10-31", STP.Permanent, WEEK_DAYS, [
        stop(1, "TON", "01:30"),
        stop(2, "PDW", "01:40")
      ])
    ];

    const schedules = shiftLateNightServices(baseSchedules);

    expect(schedules.length).to.equal(2);
    expect(schedules[0].stopTimes.length).to.equal(0);
    // the schedule that does have stops is still shifted back a day
    expect(schedules[1].calendar.runsFrom.equals("20180930")).to.be.true;
  });

  /**
   * A schedule is replaced by its copy rather than joined by it, so keeping the id is what lets a
   * caller holding one still be talking about the same train. Two of them with one id is the shape
   * `resolveLinks` drops a coupling for.
   */
  it("keeps the id the schedule it replaces was given", () => {
    const [shifted] = shiftLateNightServices([
      schedule(7, "A", "2018-10-01", "2018-10-31", STP.Permanent, WEEK_DAYS, [
        stop(1, "TON", "01:30"),
        stop(2, "PDW", "01:40")
      ])
    ]);

    expect(shifted.id).to.equal(7);
    expect(shifted.calendar.runsFrom.equals("20180930")).to.be.true;
    expect(shifted.stopTimes[0].departure_time).to.equal("25:30:30");
  });

});
