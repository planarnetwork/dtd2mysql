import * as chai from "chai";
import {awaitStream, splitCSV} from "../util";
import {Duration, LocalDate, LocalTime} from "js-joda";
import {Holiday, StopActivity} from "../../src/transxchange/TransXChange";
import {TransXChangeJourney, TransXChangeJourneyStream} from "../../src/transxchange/TransXChangeJourneyStream";

// tslint:disable

describe("TransXChangeJourneyStream", () => {
  const transxchange = {
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
        "ServiceCode": "M6_MEGA",
        "StandardService": {
          "JP384": ["JPSection-51", "JPSection-77", "JPSection-21"]
        }
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
    ],
    JourneySections: {
      "JPSection-51": [
        {
          From: { Activity: StopActivity.PickUp, StopPointRef: "118000037" },
          To: { Activity: StopActivity.PickUp, StopActivity: "1180033077" },
          RunTime: Duration.parse("PT5M")
        }
      ],
      "JPSection-77": [
        {
          From: { Activity: StopActivity.PickUp, StopPointRef: "118000037" },
          To: { Activity: StopActivity.PickUpAndSetDown, StopActivity: "1100DEC10183" },
          RunTime: Duration.parse("PT65M")
        }
      ],
      "JPSection-21": [
        {
          From: { Activity: StopActivity.PickUpAndSetDown, StopPointRef: "1100DEC10183" },
          To: { Activity: StopActivity.PickUpAndSetDown, StopActivity: "010000036", WaitTime: Duration.parse("PT5M") },
          RunTime: Duration.parse("PT115M")
        },
        {
          From: { Activity: StopActivity.PickUpAndSetDown, StopPointRef: "010000036" },
          To: { Activity: StopActivity.PickUpAndSetDown, StopActivity: "0170SGA56570" },
          RunTime: Duration.parse("PT15M")
        },
        {
          From: { Activity: StopActivity.PickUpAndSetDown, StopPointRef: "0170SGA56570" },
          To: { Activity: StopActivity.SetDown, StopActivity: "490016736W" },
          RunTime: Duration.parse("PT155M")
        }
      ],
    }
  };

  it("emits a calendar", async () => {
    const stream = new TransXChangeJourneyStream({} as Record<Holiday, LocalDate[][]>);

    stream.write(transxchange);
    stream.end();

    return awaitStream(stream, (rows: TransXChangeJourney[]) => {
      chai.expect(rows[0].calendar.startDate.toString()).to.equal("2018-06-24");
      chai.expect(rows[0].calendar.endDate.toString()).to.equal("2099-12-31");
      chai.expect(rows[0].calendar.days.toString()).to.equal("1,1,1,1,1,1,1");
      chai.expect(rows[0].calendar.id).to.equal(1);
    });
  });

  xit("merges days of the week", async () => {

  });

  xit("shortens the calendar start and end for non operational date ranges at the beginning or end of the operation period", async () => {

  });

  xit("adds exclude dates for non operational date ranges in the middle of the operation period", async () => {

  });

  xit("adds excludes for bank holidays", async () => {

  });

  xit("adds include days for bank holiday only services", async () => {

  });

  xit("calculates stops times", async () => {

  });

  xit("includes wait time in departure times and subsequent arrival times", async () => {

  });

});
