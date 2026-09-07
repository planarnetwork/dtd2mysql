import {awaitStream, splitCSV} from "../util";
import {LocalDate, } from "@js-joda/core";
import {CalendarStream} from "../../src/gtfs/CalendarStream";


describe("CalendarStream", () => {

  it("emits calendars", async () => {
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

    stream.end();

    return awaitStream(stream, (rows: string[]) => {
      const [service_id, monday, tuesday, wednesday, thursday, friday, saturday, sunday, start_date, end_date] = splitCSV(rows[1]);

      expect(service_id).to.equal("1");
      expect(monday).to.equal("1");
      expect(tuesday).to.equal("1");
      expect(wednesday).to.equal("1");
      expect(thursday).to.equal("1");
      expect(friday).to.equal("1");
      expect(saturday).to.equal("1");
      expect(sunday).to.equal("1");
      expect(start_date).to.equal("20180624");
      expect(end_date).to.equal("20991231");
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

    return awaitStream(stream, (rows: string[]) => {
      expect(rows.length).to.equal(2);
    });
  });

});

