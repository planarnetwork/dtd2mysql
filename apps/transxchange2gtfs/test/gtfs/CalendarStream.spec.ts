import * as chai from "chai";
import {awaitStream, splitCSV} from "../util";
import {LocalDate, LocalTime} from "js-joda";
import {CalendarStream} from "../../src/gtfs/CalendarStream";
import {Holiday} from "../../src/transxchange/TransXChange";

// tslint:disable

describe("CalendarStream", () => {

  it("emits calendars", async () => {
    const stream = new CalendarStream({} as Record<Holiday, LocalDate[][]>);

    stream.write({
      Services: {
        "M6_MEGA": {
          "Description": "Falmouth - Victoria,London",
          "Lines": {
            "l_M6_MEGA": "M6"
          },
          "Mode": "coach",
          "OperatingPeriod": {
            "EndDate": LocalDate.parse("2099-12-31"),
            "StartDate": LocalDate.parse("2018-06-24")
          },
          "RegisteredOperatorRef": "OId_MEGA",
          "ServiceCode": "M6_MEGA"
        }
      },
      VehicleJourneys: [
        {
          "DepartureTime": LocalTime.parse("01:00"),
          "JourneyPatternRef": "JP384",
          "LineRef": "l_M6_MEGA",
          "OperatingProfile": {
            "BankHolidayOperation": {
              "DaysOfNonOperation": [],
              "DaysOfOperation": []
            },
            "RegularDayType": [[1, 1, 1, 1, 1, 1, 1]],
            "SpecialDaysOperation": {
              "DaysOfNonOperation": [],
              "DaysOfOperation": []
            }
          },
          "ServiceRef": "M6_MEGA"
        }
      ]
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

});

