import {ParseXML, XMLStream} from "./xml/XMLStream";
import {promisify} from "util";
import {parseString} from "xml2js";
import {Converter} from "./converter/Converter";
import {StopsStream} from "./gtfs/StopsStream";
import parse = require("csv-parse");
import {NaPTANFactory, NaPTANIndex, StopLocationIndex} from "./reference/NaPTAN";
import {TransXChangeStream} from "./transxchange/TransXChangeStream";
import {FileStream} from "./converter/FileStream";
import {AgencyStream} from "./gtfs/AgencyStream";
import {RoutesStream} from "./gtfs/RoutesStream";
import {CalendarStream} from "./gtfs/CalendarStream";
import {LocalDate} from "js-joda";
import {Holiday} from "./transxchange/TransXChange";
import {BankHolidays, TransXChangeJourneyStream} from "./transxchange/TransXChangeJourneyStream";
import {CalendarDatesStream} from "./gtfs/CalendarDatesStream";
import {TripsStream} from "./gtfs/TripsStream";
import {StopTimesStream} from "./gtfs/StopTimesStream";
import * as fs from "fs";
import {TransfersStream} from "./gtfs/TransfersStream";

const exec = promisify(require("child_process").exec);

/**
 * Dependency container
 */
export class Container {
  public static readonly TMP = "/tmp/transxchange2gtfs/";

  public async getConverter(): Promise<Converter> {
    const files = new FileStream();
    const xml = new XMLStream(this.getParseXML());
    const transxchange = new TransXChangeStream();
    const journeyStream = new TransXChangeJourneyStream(this.getBankHolidays());
    const [naptanIndex, locationIndex] = await this.getNaPTANIndexes();

    files.pipe(xml).pipe(transxchange).pipe(journeyStream);

    return new Converter(
      files,
      {
        "calendar.txt": journeyStream.pipe(new CalendarStream()),
        "calendar_dates.txt": journeyStream.pipe(new CalendarDatesStream()),
        "trips.txt": journeyStream.pipe(new TripsStream()),
        "stop_times.txt": journeyStream.pipe(new StopTimesStream()),
        "agency.txt": transxchange.pipe(new AgencyStream()),
        "routes.txt": transxchange.pipe(new RoutesStream()),
        "transfers.txt": transxchange.pipe(new TransfersStream(naptanIndex, locationIndex)),
        "stops.txt": transxchange.pipe(new StopsStream(naptanIndex))
      }
    );
  }

  public async getNaPTANIndexes(): Promise<[NaPTANIndex, StopLocationIndex]> {
    const stopsZip = __dirname + "/../resource/Stops.zip";
    const stopsCSV = "/tmp/transxchange2gtfs_stops/";

    await exec("unzip -uo " + stopsZip + " -d " + stopsCSV);

    const naptanFactory = new NaPTANFactory(
      fs.createReadStream(stopsCSV + "Stops.csv", "utf8").pipe(parse())
    );

    return naptanFactory.getIndexes();
  }

  public getParseXML(): ParseXML {
    return promisify(parseString as any);
  }

  private getBankHolidays(): BankHolidays {
    const years = ["2018", "2019", "2020", "2021", "2022", "2023", "2024", "2025"];
    const dates: Record<Holiday, string[]> = {
      ChristmasEve: years.map(year => year + "-12-24"),
      ChristmasDay: years.map(year => year + "-12-25"),
      BoxingDay: years.map(year => year + "-12-26"),
      NewYearsEve: years.map(year => year + "-12-31"),
      NewYearsDay: years.map(year => year + "-01-01"),
      Jan2ndScotland: years.map(year => year + "-01-02"),
      Jan2ndHoliday: [],
      NewYearsDayHoliday: ["2019-01-01", "2020-01-01", "2021-01-01", "2022-01-03", "2023-01-02", "2024-01-01", "2025-01-01"],
      GoodFriday: ["2019-04-19", "2020-04-10", "2021-04-02", "2022-04-15", "2023-04-07", "2024-03-29", "2025-04-18"],
      EasterMonday: ["2019-04-22", "2020-04-13", "2021-04-05", "2022-04-18", "2023-04-10", "2024-04-01", "2025-04-21"],
      SpringBank: ["2019-05-06", "2020-05-04", "2021-05-03", "2022-05-02", "2023-05-01", "2024-05-06", "2025-05-05"],
      MayDay: ["2019-05-27", "2020-05-25", "2021-05-31", "2022-05-30", "2023-05-29", "2024-05-27", "2025-05-26"],
      LateSummerBankHolidayNotScotland: ["2019-08-26", "2020-08-31", "2021-08-30", "2022-08-29", "2023-08-28", "2024-08-26", "2025-08-25"],
      AugustBankHolidayScotland: ["2019-08-26", "2020-08-31", "2021-08-30", "2022-08-29", "2023-08-28", "2024-08-26", "2025-08-25"],
      ChristmasDayHoliday: ["2018-12-25", "2019-12-25", "2020-12-25", "2021-12-27", "2022-12-26", "2023-12-25", "2024-12-25", "2025-12-25"],
      BoxingDayHoliday: ["2018-12-26", "2019-12-26", "2020-12-28", "2021-12-28", "2022-12-27", "2023-12-26", "2024-12-26", "2025-12-26"],
      AllBankHolidays: []
    };

    dates[Holiday.AllBankHolidays] = [
      ...dates.NewYearsDayHoliday,
      ...dates.GoodFriday,
      ...dates.EasterMonday,
      ...dates.SpringBank,
      ...dates.MayDay,
      ...dates.LateSummerBankHolidayNotScotland,
      ...dates.ChristmasDayHoliday,
      ...dates.BoxingDayHoliday
    ];

    return Object.entries(dates).reduce(
      (index, [key, dateStrings]) => {
        index[key as Holiday] = dateStrings.map(date => LocalDate.parse(date));

        return index;
      },
      {} as BankHolidays
    );
  }

}