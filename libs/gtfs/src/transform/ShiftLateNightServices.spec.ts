import {describe, it, expect} from 'vitest';
import {STP} from "../model/OverlayRecord";
import {schedule} from "./MergeSchedules.spec";
import {stop} from "./ApplyAssociations.spec";
import {shiftLateNightServices} from "./ShiftLateNightServices";
import {applyOverlays} from "./ApplyOverlays";
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

  /** See `runsInTheRepeatedHour`. */
  describe("on the day the clocks go back", () => {
    const SUNDAY: Days = { 0: 1, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

    const overground = (id: number, from: string, to: string, time: string, stp = STP.New, days = SUNDAY) =>
      schedule(id, "A", from, to, stp, days, [
        stop(1, "HHY", time),
        stop(2, "NXG", plusTenMinutes(time))
      ], "LO");

    it("leaves an Overground schedule dated to the change day alone", () => {
      const [kept] = shiftLateNightServices([overground(1, "2026-10-25", "2026-10-25", "01:05")]);

      expect(kept.calendar.runsFrom.equals("20261025")).to.be.true;
      expect(kept.calendar.runsTo.equals("20261025")).to.be.true;
      expect(kept.calendar.days[0]).to.equal(1);
      expect(kept.stopTimes[0].departure_time).to.equal("01:05:30");
    });

    it("shifts the standard schedule that covers the first pass of the hour", () => {
      const [shifted] = shiftLateNightServices([
        overground(1, "2026-06-01", "2026-12-31", "01:05", STP.Permanent)
      ]);

      expect(shifted.calendar.runsFrom.equals("20260531")).to.be.true;
      expect(shifted.stopTimes[0].departure_time).to.equal("25:05:30");
    });

    /** An overlay on that Sunday retimes the BST departure, so it is still the first pass. */
    it("shifts an overlay dated to the change day", () => {
      const [shifted] = shiftLateNightServices([
        overground(1, "2026-10-25", "2026-10-25", "01:05", STP.Overlay)
      ]);

      expect(shifted.calendar.runsFrom.equals("20261024")).to.be.true;
      expect(shifted.stopTimes[0].departure_time).to.equal("25:05:30");
    });

    it("shifts a schedule that runs on the change day and on other days too", () => {
      const [shifted] = shiftLateNightServices([
        overground(1, "2026-10-18", "2026-10-25", "01:05")
      ]);

      expect(shifted.calendar.runsFrom.equals("20261017")).to.be.true;
      expect(shifted.stopTimes[0].departure_time).to.equal("25:05:30");
    });

    it("shifts a schedule dated to a Sunday in October that is not the last one", () => {
      const [shifted] = shiftLateNightServices([
        overground(1, "2026-10-18", "2026-10-18", "01:05")
      ]);

      expect(shifted.calendar.runsFrom.equals("20261017")).to.be.true;
    });

    /** Narrowed onto the change day by an overlay, not dated to it by the operator. */
    it("shifts a record the overlays have whittled down to the change day", () => {
      const wide = overground(1, "2026-10-04", "2026-11-29", "01:05");
      const index = applyOverlays([
        wide,
        overground(2, "2026-10-04", "2026-10-18", "01:05"),
        overground(3, "2026-11-01", "2026-11-29", "01:05")
      ]);

      const narrowed = index["A"].find(s => s.id === 1)!;
      const [shifted] = shiftLateNightServices([narrowed]);

      expect(shifted.stopTimes[0].departure_time).to.equal("25:05:30");
    });

    /** No other Overground line runs through the change, so this is an ordinary late night train. */
    it("shifts an Overground schedule on another line", () => {
      const [shifted] = shiftLateNightServices([
        schedule(1, "A", "2026-10-25", "2026-10-25", STP.New, SUNDAY, [
          stop(1, "RMF", "01:05"),
          stop(2, "UPM", "01:15")
        ], "LO")
      ]);

      expect(shifted.calendar.runsFrom.equals("20261024")).to.be.true;
      expect(shifted.stopTimes[0].departure_time).to.equal("25:05:30");
    });

    /** Only 01:00 to 01:59 repeats; midnight comes round once whatever the clocks do. */
    it("shifts a schedule departing before the repeated hour", () => {
      const [shifted] = shiftLateNightServices([overground(1, "2026-10-25", "2026-10-25", "00:45")]);

      expect(shifted.calendar.runsFrom.equals("20261024")).to.be.true;
      expect(shifted.stopTimes[0].departure_time).to.equal("24:45:30");
    });

    it("shifts another operator's schedule dated to the change day", () => {
      const [shifted] = shiftLateNightServices([
        schedule(1, "A", "2026-10-25", "2026-10-25", STP.New, SUNDAY, [
          stop(1, "VIC", "01:05"),
          stop(2, "TBD", "01:15")
        ])
      ]);

      expect(shifted.calendar.runsFrom.equals("20261024")).to.be.true;
      expect(shifted.stopTimes[0].departure_time).to.equal("25:05:30");
    });

    /** 2027's change day is the 31st, where "after the 24th" and "no Sunday left" diverge. */
    it("recognises a change day that falls on the last day of the month", () => {
      const [kept] = shiftLateNightServices([overground(1, "2027-10-31", "2027-10-31", "01:05")]);

      expect(kept.calendar.runsFrom.equals("20271031")).to.be.true;
    });
  });

});

function plusTenMinutes(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);

  return `${hours.toString().padStart(2, "0")}:${(minutes + 10).toString().padStart(2, "0")}`;
}
