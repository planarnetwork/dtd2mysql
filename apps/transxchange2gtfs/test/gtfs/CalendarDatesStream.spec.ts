import * as chai from "chai";
import {awaitStream, splitCSV} from "../util";
import {LocalDate} from "js-joda";
import {CalendarStream} from "../../src/gtfs/CalendarStream";
import {CalendarDatesStream} from "../../src/gtfs/CalendarDatesStream";

// tslint:disable

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

    return awaitStream(stream, (rows: string[]) => {
      const exclude = splitCSV(rows[1]);
      const include = splitCSV(rows[2]);

      chai.expect(exclude[0]).to.equal("1");
      chai.expect(exclude[1]).to.equal("20181225");
      chai.expect(exclude[2]).to.equal("2");
      chai.expect(include[0]).to.equal("1");
      chai.expect(include[1]).to.equal("20180601");
      chai.expect(include[2]).to.equal("1");
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

