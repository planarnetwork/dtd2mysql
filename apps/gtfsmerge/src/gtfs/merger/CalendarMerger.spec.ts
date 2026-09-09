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

    await m.write([calendar("a", "20260101", "20261231"), calendar("b", "20260101", "20260630")], {});

    expect(calendars.rows.length).to.equal(2);
  });

  /**
   * The same set of exceptions, listed in the order each feed happened to write
   * them. Compared as listed, the merged feed held the same service twice.
   */
  it("collapses two identical calendars whose dates are listed in a different order", async () => {
    const {calendars, merger: m} = merger();
    const map = await m.write(
      [calendar("a", "20260101", "20261231"), calendar("b", "20260101", "20261231")],
      {
        a: [
          {service_id: "a", date: "20260105", exception_type: 2},
          {service_id: "a", date: "20260112", exception_type: 2}
        ],
        b: [
          {service_id: "b", date: "20260112", exception_type: 2},
          {service_id: "b", date: "20260105", exception_type: 2}
        ]
      }
    );

    expect(calendars.rows.length).to.equal(1);
    expect(map).to.deep.equal({a: 1, b: 1});
  });

  /**
   * A calendar parsed from calendar.txt is built in the order of its columns and
   * a synthesised one in the order CalendarFactory writes it, so a hash taken
   * from the row's own field order made the same service two.
   */
  it("collapses a synthesised calendar onto an identical parsed one", async () => {
    const {calendars, merger: m} = merger();
    // Mondays for three weeks, published as a calendar by one feed and as the
    // three dates it runs on by the other.
    const map = await m.write([calendar("a", "20260105", "20260119")], {
      b: [
        {service_id: "b", date: "20260105", exception_type: 1},
        {service_id: "b", date: "20260112", exception_type: 1},
        {service_id: "b", date: "20260119", exception_type: 1}
      ]
    });

    expect(calendars.rows.length).to.equal(1);
    expect(map).to.deep.equal({a: 1, b: 1});
  });

  /**
   * A service that never operates is trips nothing can be planned onto, and
   * a feed says it in more than one way.
   */
  it("drops a calendar that runs on no day", async () => {
    const {calendars, merger: m} = merger();
    const map = await m.write([calendar("a", "20260101", "20261231", 0)], {});

    expect(calendars.rows).to.deep.equal([]);
    expect(map).to.deep.equal({});
  });

  it("drops a calendar whose every running day is excluded", async () => {
    const {calendars, merger: m} = merger();
    // Mondays for a fortnight, both of them removed.
    const map = await m.write([calendar("a", "20260105", "20260112")], {
      a: [
        {service_id: "a", date: "20260105", exception_type: 2},
        {service_id: "a", date: "20260112", exception_type: 2}
      ]
    });

    expect(calendars.rows).to.deep.equal([]);
    expect(map).to.deep.equal({});
  });

  it("drops a service whose exception dates are all removals", async () => {
    const {calendars, merger: m} = merger();
    const map = await m.write([], {
      orphan: [
        {service_id: "orphan", date: "20260105", exception_type: 2},
        {service_id: "orphan", date: "20260112", exception_type: 2}
      ]
    });

    expect(calendars.rows).to.deep.equal([]);
    expect(map).to.deep.equal({});
  });

  it("keeps a service whose exceptions remove some but not all of its days", async () => {
    const {calendars, merger: m} = merger();
    const map = await m.write([calendar("a", "20260105", "20260119")], {
      a: [{service_id: "a", date: "20260112", exception_type: 2}]
    });

    expect(calendars.rows.length).to.equal(1);
    expect(map).to.deep.equal({a: 1});
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
