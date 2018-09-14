import {Readable, Writable} from "stream";
import {ParseXML} from "../xml/ParseXML";
import {GetStops} from "../gtfs/StopsFactory";
import * as AdmZip from "adm-zip";
import {ParseTransXChange} from "../transxchange/TransXChangeFactory";

const streamToString = require("stream-to-string");

/**
 * Converts the TransXChange input stream to a GTFS zip output stream
 */
export class Converter {

  constructor(
    private readonly parseXML: ParseXML,
    private readonly archive: AdmZip,
    private readonly parseTransXChange: ParseTransXChange,
    private readonly getStops: GetStops
  ) {}

  /**
   * Load the XML into memory, convert it to JSON, then a TransXChange object and the pass that to each of the GTFS file
   * factory methods.
   */
  public async process(input: Readable, output: Writable): Promise<void> {
    const xml = await streamToString(input);
    const json = await this.parseXML(xml);
    const transxchange = this.parseTransXChange(json);

    // this.archive.addFile("agency.txt", Buffer.from(agency, "utf8"));
    this.archive.addFile("stops.txt", Buffer.from(this.getStops(transxchange), "utf8"));
    // this.archive.addFile("routes.txt", Buffer.from(routes, "utf8"));
    // this.archive.addFile("calendar.txt", Buffer.from(calendar, "utf8"));
    // this.archive.addFile("trips.txt", Buffer.from(trips, "utf8"));
    // this.archive.addFile("stop_times.txt", Buffer.from(stopTimes, "utf8"));

    output.write(this.archive.toBuffer());
    output.write(null);
  }
}
