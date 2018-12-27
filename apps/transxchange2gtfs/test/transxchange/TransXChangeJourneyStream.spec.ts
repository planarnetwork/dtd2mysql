import * as chai from "chai";
import {awaitStream} from "../util";
import {Duration, LocalDate, LocalTime} from "js-joda";
import {Holiday, StopActivity} from "../../src/transxchange/TransXChange";
import {
  BankHolidays,
  TransXChangeJourney,
  TransXChangeJourneyStream
} from "../../src/transxchange/TransXChangeJourneyStream";

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
      },
      {
        "DepartureTime": LocalTime.parse("01:00"),
        "JourneyPatternRef": "JP384",
        "LineRef": "l_M6_MEGA",
        "OperatingProfile": {
          "BankHolidayOperation": {
            "DaysOfNonOperation": [],
            "DaysOfOperation": []
          },
          "RegularDayType": [[1, 0, 1, 0, 0, 0, 0], [1, 1, 0, 0, 1, 0, 0]],
          "SpecialDaysOperation": {
            "DaysOfNonOperation": [],
            "DaysOfOperation": []
          }
        },
        "ServiceRef": "M6_MEGA"
      },
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
            "DaysOfNonOperation": [{
              "StartDate": LocalDate.parse("2018-06-24"),
              "EndDate": LocalDate.parse("2018-07-31")
            }],
            "DaysOfOperation": []
          }
        },
        "ServiceRef": "M6_MEGA"
      },
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
            "DaysOfNonOperation": [{
              "StartDate": LocalDate.parse("2018-07-24"),
              "EndDate": LocalDate.parse("2099-12-31")
            }],
            "DaysOfOperation": []
          }
        },
        "ServiceRef": "M6_MEGA"
      },
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
            "DaysOfNonOperation": [{
              "StartDate": LocalDate.parse("2018-07-24"),
              "EndDate": LocalDate.parse("2018-07-25")
            }],
            "DaysOfOperation": []
          }
        },
        "ServiceRef": "M6_MEGA"
      },
      {
        "DepartureTime": LocalTime.parse("23:00"),
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
      },
      {
        "DepartureTime": LocalTime.parse("23:00"),
        "JourneyPatternRef": "JP384",
        "LineRef": "l_M6_MEGA",
        "OperatingProfile": {
          "BankHolidayOperation": {
            "DaysOfNonOperation": ["ChristmasDayHoliday", "BoxingDayHoliday"],
            "DaysOfOperation": []
          },
          "RegularDayType": [[1, 1, 1, 1, 1, 1, 1]],
          "SpecialDaysOperation": {
            "DaysOfNonOperation": [],
            "DaysOfOperation": []
          }
        },
        "ServiceRef": "M6_MEGA"
      },
      {
        "DepartureTime": LocalTime.parse("01:00"),
        "JourneyPatternRef": "JP384",
        "LineRef": "l_M6_MEGA",
        "OperatingProfile": {
          "BankHolidayOperation": {
            "DaysOfNonOperation": [],
            "DaysOfOperation": ["ChristmasDay"]
          },
          "RegularDayType": "HolidaysOnly",
          "SpecialDaysOperation": {
            "DaysOfNonOperation": [],
            "DaysOfOperation": []
          }
        },
        "ServiceRef": "M6_MEGA"
      },
    ],
    JourneySections: {
      "JPSection-51": [
        {
          From: { Activity: StopActivity.PickUp, StopPointRef: "118000037" },
          To: { Activity: StopActivity.PickUp, StopPointRef: "1180033077" },
          RunTime: Duration.parse("PT5M")
        }
      ],
      "JPSection-77": [
        {
          From: { Activity: StopActivity.PickUp, StopPointRef: "1180033077" },
          To: { Activity: StopActivity.PickUpAndSetDown, StopPointRef: "1100DEC10183" },
          RunTime: Duration.parse("PT65M")
        }
      ],
      "JPSection-21": [
        {
          From: { Activity: StopActivity.PickUpAndSetDown, StopPointRef: "1100DEC10183" },
          To: { Activity: StopActivity.PickUpAndSetDown, StopPointRef: "010000036", WaitTime: Duration.parse("PT5M") },
          RunTime: Duration.parse("PT115M")
        },
        {
          From: { Activity: StopActivity.PickUpAndSetDown, StopPointRef: "010000036" },
          To: { Activity: StopActivity.PickUpAndSetDown, StopPointRef: "0170SGA56570" },
          RunTime: Duration.parse("PT15M")
        },
        {
          From: { Activity: StopActivity.PickUpAndSetDown, StopPointRef: "0170SGA56570" },
          To: { Activity: StopActivity.SetDown, StopPointRef: "490016736W" },
          RunTime: Duration.parse("PT155M")
        }
      ],
    }
  };

  it("emits a calendar", async () => {
    const stream = new TransXChangeJourneyStream({} as BankHolidays);

    stream.write(transxchange);
    stream.end();

    return awaitStream(stream, (rows: TransXChangeJourney[]) => {
      chai.expect(rows[0].calendar.startDate.toString()).to.equal("2018-06-24");
      chai.expect(rows[0].calendar.endDate.toString()).to.equal("2099-12-31");
      chai.expect(rows[0].calendar.days.toString()).to.equal("1,1,1,1,1,1,1");
      chai.expect(rows[0].calendar.id).to.equal(1);
    });
  });

  it("merges days of the week", async () => {
    const stream = new TransXChangeJourneyStream({} as BankHolidays);

    stream.write(transxchange);
    stream.end();

    return awaitStream(stream, (rows: TransXChangeJourney[]) => {
      chai.expect(rows[1].calendar.id).to.equal(2);
      chai.expect(rows[1].calendar.days.toString()).to.equal("1,1,1,0,1,0,0");
    });
  });

  it("shortens the calendar start and end for non operational date ranges at the beginning or end of the operation period", async () => {
    const stream = new TransXChangeJourneyStream({} as BankHolidays);

    stream.write(transxchange);
    stream.end();

    return awaitStream(stream, (rows: TransXChangeJourney[]) => {
      chai.expect(rows[2].calendar.startDate.toString()).to.equal("2018-08-01");
      chai.expect(rows[2].calendar.endDate.toString()).to.equal("2099-12-31");
      chai.expect(rows[3].calendar.startDate.toString()).to.equal("2018-06-24");
      chai.expect(rows[3].calendar.endDate.toString()).to.equal("2018-07-23");
    });
  });

  it("adds exclude dates for non operational date ranges in the middle of the operation period", async () => {
    const stream = new TransXChangeJourneyStream({} as BankHolidays);

    stream.write(transxchange);
    stream.end();

    return awaitStream(stream, (rows: TransXChangeJourney[]) => {
      chai.expect(rows[4].calendar.excludes[0].toString()).to.equal("2018-07-24");
      chai.expect(rows[4].calendar.excludes[1].toString()).to.equal("2018-07-25");
      chai.expect(rows[4].calendar.excludes.length).to.equal(2);
    });

  });

  it("adds excludes for bank holidays", async () => {
    const dates = {
      ChristmasDayHoliday: [LocalDate.parse("2017-12-25"), LocalDate.parse("2018-12-25"), LocalDate.parse("2019-12-25")],
      BoxingDayHoliday: [LocalDate.parse("2017-12-26"), LocalDate.parse("2018-12-26"), LocalDate.parse("2019-12-26")]
    };
    const stream = new TransXChangeJourneyStream(dates as BankHolidays);

    stream.write(transxchange);
    stream.end();

    return awaitStream(stream, (rows: TransXChangeJourney[]) => {
      chai.expect(rows[6].calendar.excludes[0].toString()).to.equal("2018-12-25");
      chai.expect(rows[6].calendar.excludes[1].toString()).to.equal("2019-12-25");
      chai.expect(rows[6].calendar.excludes[2].toString()).to.equal("2018-12-26");
      chai.expect(rows[6].calendar.excludes[3].toString()).to.equal("2019-12-26");
    });

  });

  it("adds include days for bank holiday only services", async () => {
    const dates = {
      ChristmasDay: [LocalDate.parse("2017-12-25"), LocalDate.parse("2018-12-25"), LocalDate.parse("2019-12-25")]
    };
    const stream = new TransXChangeJourneyStream(dates as BankHolidays);

    stream.write(transxchange);
    stream.end();

    return awaitStream(stream, (rows: TransXChangeJourney[]) => {
      chai.expect(rows[7].calendar.days.toString()).to.equal("0,0,0,0,0,0,0");
      chai.expect(rows[7].calendar.startDate.toString()).to.equal("2018-06-24");
      chai.expect(rows[7].calendar.endDate.toString()).to.equal("2099-12-31");
      chai.expect(rows[7].calendar.includes[0].toString()).to.equal("2018-12-25");
      chai.expect(rows[7].calendar.includes[1].toString()).to.equal("2019-12-25");
    });


  });

  it("calculates stops times", async () => {
    const stream = new TransXChangeJourneyStream({} as BankHolidays);

    stream.write(transxchange);
    stream.end();

    return awaitStream(stream, (rows: TransXChangeJourney[]) => {
      chai.expect(rows[0].stops[0].dropoff).to.equal(false);
      chai.expect(rows[0].stops[0].pickup).to.equal(true);
      chai.expect(rows[0].stops[0].stop).to.equal("118000037");
      chai.expect(rows[0].stops[0].arrivalTime).to.equal("01:00:00");
      chai.expect(rows[0].stops[0].departureTime).to.equal("01:00:00");

      chai.expect(rows[0].stops[1].dropoff).to.equal(false);
      chai.expect(rows[0].stops[1].pickup).to.equal(true);
      chai.expect(rows[0].stops[1].stop).to.equal("1180033077");
      chai.expect(rows[0].stops[1].arrivalTime).to.equal("01:05:00");
      chai.expect(rows[0].stops[1].departureTime).to.equal("01:05:00");
    });
  });

  it("includes wait time in departure times and subsequent arrival times", async () => {
    const stream = new TransXChangeJourneyStream({} as BankHolidays);

    stream.write(transxchange);
    stream.end();

    return awaitStream(stream, (rows: TransXChangeJourney[]) => {
      chai.expect(rows[0].stops[2].dropoff).to.equal(true);
      chai.expect(rows[0].stops[2].pickup).to.equal(true);
      chai.expect(rows[0].stops[2].stop).to.equal("1100DEC10183");
      chai.expect(rows[0].stops[2].arrivalTime).to.equal("02:10:00");
      chai.expect(rows[0].stops[2].departureTime).to.equal("02:10:00");

      chai.expect(rows[0].stops[3].dropoff).to.equal(true);
      chai.expect(rows[0].stops[3].pickup).to.equal(true);
      chai.expect(rows[0].stops[3].stop).to.equal("010000036");
      chai.expect(rows[0].stops[3].arrivalTime).to.equal("04:05:00");
      chai.expect(rows[0].stops[3].departureTime).to.equal("04:10:00");
    });

  });

  it("rolls over midnight", async () => {
    const stream = new TransXChangeJourneyStream({} as BankHolidays);

    stream.write(transxchange);
    stream.end();

    return awaitStream(stream, (rows: TransXChangeJourney[]) => {
      chai.expect(rows[5].stops[0].dropoff).to.equal(false);
      chai.expect(rows[5].stops[0].pickup).to.equal(true);
      chai.expect(rows[5].stops[0].stop).to.equal("118000037");
      chai.expect(rows[5].stops[0].arrivalTime).to.equal("23:00:00");
      chai.expect(rows[5].stops[0].departureTime).to.equal("23:00:00");

      chai.expect(rows[5].stops[2].dropoff).to.equal(true);
      chai.expect(rows[5].stops[2].pickup).to.equal(true);
      chai.expect(rows[5].stops[2].stop).to.equal("1100DEC10183");
      chai.expect(rows[5].stops[2].arrivalTime).to.equal("24:10:00");
      chai.expect(rows[5].stops[2].departureTime).to.equal("24:10:00");

      chai.expect(rows[5].stops[3].dropoff).to.equal(true);
      chai.expect(rows[5].stops[3].pickup).to.equal(true);
      chai.expect(rows[5].stops[3].stop).to.equal("010000036");
      chai.expect(rows[5].stops[3].arrivalTime).to.equal("26:05:00");
      chai.expect(rows[5].stops[3].departureTime).to.equal("26:10:00");
    });

  });

});
