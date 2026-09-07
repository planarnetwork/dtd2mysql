import {describe, it, expect} from "vitest";
import {awaitStream} from "../testing/util";
import {LocalDate} from "@js-joda/core";
import {CalendarStream} from "./CalendarStream";
import {CalendarDatesStream} from "./CalendarDatesStream";


describe("CalendarDatesStream", () => {

  it("emits calendar dates", async () => {
    const stream = new CalendarDatesStream();

    stream.write({
      calendar: {
        id: 1,
        startDate: LocalDate.parse("2018-06-24"),
        endDate: LocalDate.parse("2099-12-31"),
        days: [1, 1, 1, 1, 1, 1, 1],
        includes: [LocalDate.parse("2018-06-01")],
        excludes: [LocalDate.parse("2018-12-25")]
      }
    });

    stream.end();

    return awaitStream(stream, (rows: any[]) => {
      const exclude = rows[0];
      const include = rows[1];

      expect(exclude.service_id).to.equal(1);
      expect(exclude.date).to.equal("20181225");
      expect(exclude.exception_type).to.equal(2);
      expect(include.service_id).to.equal(1);
      expect(include.date).to.equal("20180601");
      expect(include.exception_type).to.equal(1);
    });
  });

  it("deduplicates rows where the same date appears in both includes and excludes", async () => {
    const stream = new CalendarDatesStream();

    stream.write({
      calendar: {
        id: 1,
        startDate: LocalDate.parse("2018-06-24"),
        endDate: LocalDate.parse("2099-12-31"),
        days: [1, 1, 1, 1, 1, 1, 1],
        excludes: [LocalDate.parse("2018-12-25")],
        includes: [LocalDate.parse("2018-12-25")]
      }
    });

    stream.end();

    return awaitStream(stream, (rows: any[]) => {
      // one row only; the duplicate (service_id=1, date=20181225) must not be written twice
      expect(rows.length).to.equal(1);
      const {service_id, date} = rows[0];
      expect(service_id).to.equal(1);
      expect(date).to.equal("20181225");
    });
  });

  it("doesn't emit the same calendar twice", async () => {
    const stream = new CalendarStream();

    stream.write({
      calendar: {
        id: 1,
        startDate: LocalDate.parse("2018-06-24"),
        endDate: LocalDate.parse("2099-12-31"),
        days: [1, 1, 1, 1, 1, 1, 1],
        includes: [],
        excludes: []
      }
    });

    stream.write({
      calendar: {
        id: 1,
        startDate: LocalDate.parse("2018-06-24"),
        endDate: LocalDate.parse("2099-12-31"),
        days: [1, 1, 1, 1, 1, 1, 1],
        includes: [],
        excludes: []
      }
    });

    stream.end();

    return awaitStream(stream, (rows: any[]) => {
      expect(rows.length).to.equal(1);
    });
  });

});

