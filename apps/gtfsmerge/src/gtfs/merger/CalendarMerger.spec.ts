import {describe, it, expect} from "vitest";
import {CalendarDateRow, CalendarRow} from "@gb-transit/gtfs-schema";
import {CalendarMerger} from "./CalendarMerger";
import {CalendarFactory} from "../calendar/CalendarFactory";
import {MemoizedSequence} from "../../sequence/MemoizedSequence";
import {collect, calendar} from "./Fixtures";

describe("CalendarMerger", () => {

  const merger = () => {
    const calendars = collect<CalendarRow>();
    const dates = collect<CalendarDateRow>();

    return {
      calendars,
      dates,
      merger: new CalendarMerger(calendars, dates, new CalendarFactory(), new MemoizedSequence())
    };
  };

  it("collapses two identical calendars onto one service", async () => {
    const {calendars, merger: m} = merger();
    const map = await m.write([calendar("a", "20260101", "20261231"), calendar("b", "20260101", "20261231")], {});

    // Same days, same dates, so the same service however the two feeds numbered it.
    expect(calendars.rows.length).to.equal(1);
    expect(map).to.deep.equal({a: 1, b: 1});
  });

  it("keeps two calendars that differ", async () => {
    const {calendars, merger: m} = merger();

    await m.write([calendar("a", "20260101", "20261231"), calendar("b", "20260101", "20261231", 0)], {});

    expect(calendars.rows.length).to.equal(2);
  });

  it("synthesises a calendar for dates with no calendar row", async () => {
    const {calendars, merger: m} = merger();
    const map = await m.write([], {
      orphan: [
        {service_id: "orphan", date: "20260105", exception_type: 1},
        {service_id: "orphan", date: "20260112", exception_type: 1}
      ]
    });

    expect(calendars.rows.length).to.equal(1);
    expect(map["orphan"]).to.not.equal(undefined);
  });

});
