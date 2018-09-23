import * as chai from "chai";
import {awaitStream, splitCSV} from "../util";
import {LocalDate, LocalTime} from "js-joda";
import {CalendarStream} from "../../src/gtfs/CalendarStream";

// tslint:disable

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

      chai.expect(service_id).to.equal("1");
      chai.expect(monday).to.equal("1");
      chai.expect(tuesday).to.equal("1");
      chai.expect(wednesday).to.equal("1");
      chai.expect(thursday).to.equal("1");
      chai.expect(friday).to.equal("1");
      chai.expect(saturday).to.equal("1");
      chai.expect(sunday).to.equal("1");
      chai.expect(start_date).to.equal("2018-06-24");
      chai.expect(end_date).to.equal("2099-12-31");
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
      chai.expect(rows.length).to.equal(2);
    });
  });

});

