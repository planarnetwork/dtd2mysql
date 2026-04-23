import { ParseXML, XMLStream } from "./xml/XMLStream";
import { promisify } from "util";
import { parseString } from "xml2js";
import { Converter } from "./converter/Converter";
import { StopsStream } from "./gtfs/StopsStream";
import { NaPTANFactory, NaPTANIndex, StopLocationIndex } from "./reference/NaPTAN";
import { TransXChangeStream } from "./transxchange/TransXChangeStream";
import { FileStream } from "./converter/FileStream";
import { AgencyStream } from "./gtfs/AgencyStream";
import { RoutesStream } from "./gtfs/RoutesStream";
import { CalendarStream } from "./gtfs/CalendarStream";
import { BankHolidays, TransXChangeJourneyStream } from "./transxchange/TransXChangeJourneyStream";
import { getBankHolidays } from "./reference/BankHolidays";
import { CalendarDatesStream } from "./gtfs/CalendarDatesStream";
import { TripsStream } from "./gtfs/TripsStream";
import { StopTimesStream } from "./gtfs/StopTimesStream";
import * as fs from "fs";
import { TransfersStream } from "./gtfs/TransfersStream";
import { GetStopData } from "./converter/GetStopData";
import { parse } from "csv-parse";

/**
 * Dependency container
 */
export class Container {
  public static readonly TMP = `/tmp/transxchange2gtfs_${process.pid}/`;

  public async getConverter(refresh: boolean, skipStops: boolean): Promise<Converter> {
    if (!skipStops && (!fs.existsSync("/tmp/Stops.csv") || refresh)) {
      console.log("Downloading latest stop data from NAPTAN.");
      await new GetStopData().update();
      console.log("Done");
    }

    const files = new FileStream();
    const xml = new XMLStream(this.getParseXML());
    const transxchange = new TransXChangeStream();
    const journeyStream = new TransXChangeJourneyStream(this.getBankHolidays());
    const [naptanIndex, locationIndex] = skipStops ? [{}, {}] : await this.getNaPTANIndexes();

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
    const naptanFactory = new NaPTANFactory(
      fs.createReadStream("/tmp/Stops.csv", "utf8").pipe(parse())
    );

    return naptanFactory.getIndexes();
  }

  public getParseXML(): ParseXML {
    return promisify(parseString as any);
  }

  private getBankHolidays(): BankHolidays {
    return getBankHolidays();
  }

}
