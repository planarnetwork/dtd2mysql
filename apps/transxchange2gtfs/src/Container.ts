import {promisify} from "util";
import {parseString} from "xml2js";
import * as fs from "fs";
import * as os from "node:os";
import * as path from "node:path";
import {naptanCsv} from "@gb-transit/naptan";
import {
  AgencyStream, BankHolidays, CalendarDatesStream, CalendarStream, FileStream, NaPTANIndex,
  ParseXML, RoutesStream, ShapesStream, StopLocationIndex, StopTimesStream, StopsStream,
  TransXChangeJourneyStream, TransXChangeStream, TransfersStream, TripsStream, XMLStream,
  getBankHolidays, naptanIndexes
} from "@gb-transit/txc-source";
import {Converter} from "./converter/Converter";

/**
 * Where NaPTAN is cached between runs.
 */
const CACHE = path.join(os.tmpdir(), "gb-transit-naptan");

export interface ConverterOptions {
  /** Re-download NaPTAN even if a cached copy is current. */
  readonly refreshStops?: boolean;
  /** Build no stops.txt or transfers.txt, and download nothing. */
  readonly skipStops?: boolean;
  /**
   * Read NaPTAN from this file instead of downloading it.
   *
   * The reason the end to end test can run at all: the download is 100MB and a
   * test that depends on the DfT being up is not a test.
   */
  readonly naptanFile?: string;
  /** Where the files are assembled before being zipped. */
  readonly tmp?: string;
}

/**
 * Dependency container
 */
export class Container {

  public async getConverter(options: ConverterOptions = {}): Promise<Converter> {
    const [naptanIndex, locationIndex] = await this.getNaPTANIndexes(options);
    const files = new FileStream();
    const xml = new XMLStream(this.getParseXML());
    const transxchange = new TransXChangeStream();
    const journeys = new TransXChangeJourneyStream(this.getBankHolidays());

    files.pipe(xml).pipe(transxchange).pipe(journeys);

    return new Converter(
      files,
      [
        journeys.pipe(new CalendarStream()),
        journeys.pipe(new CalendarDatesStream()),
        journeys.pipe(new TripsStream()),
        journeys.pipe(new StopTimesStream()),
        journeys.pipe(new ShapesStream()),
        transxchange.pipe(new AgencyStream()),
        transxchange.pipe(new RoutesStream()),
        transxchange.pipe(new TransfersStream(naptanIndex, locationIndex)),
        transxchange.pipe(new StopsStream(naptanIndex))
      ],
      options.tmp ?? path.join(os.tmpdir(), `transxchange2gtfs_${process.pid}`)
    );
  }

  public async getNaPTANIndexes(
    options: ConverterOptions
  ): Promise<[NaPTANIndex, StopLocationIndex]> {
    if (options.skipStops) {
      return [{}, {}];
    }

    if (options.naptanFile !== undefined) {
      return naptanIndexes(fs.readFileSync(options.naptanFile, "utf8"));
    }

    return naptanIndexes(await naptanCsv(CACHE, options.refreshStops ? 0 : 30)());
  }

  public getParseXML(): ParseXML {
    return promisify(parseString as any);
  }

  private getBankHolidays(): BankHolidays {
    return getBankHolidays();
  }

}
