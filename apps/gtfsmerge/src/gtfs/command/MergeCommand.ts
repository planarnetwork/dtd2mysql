import {loadGTFS} from "../input/loadGTFS";
import {exec} from "child_process";
import {MergedGTFS} from "../MergedGTFS";
import * as fs from "fs";
import {GTFSFileStream} from "../output/GTFSFileStream";
import {sync as rimraf} from "rimraf";
import {CalendarFactory} from "../../calendar/CalendarFactory";


/**
 * Merges a list of input GTFS files into a single output file
 */
export class MergeCommand {

  constructor(
    private readonly calendarStream: GTFSFileStream,
    private readonly calendarDatesStream: GTFSFileStream,
    private readonly tripsStream: GTFSFileStream,
    private readonly stopTimesStream: GTFSFileStream,
    private readonly routesStream: GTFSFileStream,
    private readonly agencyStream: GTFSFileStream,
    private readonly stopsStream: GTFSFileStream,
    private readonly transfersStream: GTFSFileStream,
    private readonly tempFolder: string
  ) {}

  /**
   * Iterate over the list of inputs loading and merging each one at a time.
   */
  public async run(inputs: string[], output: string, transferDistance: number, stopPrefix: string): Promise<void> {
    const mergedGTFS = new MergedGTFS(
      this.calendarStream,
      this.calendarDatesStream,
      this.tripsStream,
      this.stopTimesStream,
      this.routesStream,
      this.agencyStream,
      this.stopsStream,
      this.transfersStream,
      transferDistance,
      new CalendarFactory()
    );

    if (fs.existsSync(this.tempFolder)) {
      rimraf(this.tempFolder);
    }

    fs.mkdirSync(this.tempFolder);

    this.calendarStream.pipe(fs.createWriteStream(this.tempFolder + "calendar.txt"));
    this.calendarDatesStream.pipe(fs.createWriteStream(this.tempFolder + "calendar_dates.txt"));
    this.tripsStream.pipe(fs.createWriteStream(this.tempFolder + "trips.txt"));
    this.stopTimesStream.pipe(fs.createWriteStream(this.tempFolder + "stop_times.txt"));
    this.routesStream.pipe(fs.createWriteStream(this.tempFolder + "routes.txt"));
    this.agencyStream.pipe(fs.createWriteStream(this.tempFolder + "agency.txt"));
    this.stopsStream.pipe(fs.createWriteStream(this.tempFolder + "stops.txt"));
    this.transfersStream.pipe(fs.createWriteStream(this.tempFolder + "transfers.txt"));

    for (const input of inputs) {
      console.log("Loading " + input);
      const gtfs = await loadGTFS(input, stopPrefix);

      console.log("Processing " + input);
      await mergedGTFS.merge(gtfs);
    }

    console.log("Writing " + output);
    await mergedGTFS.end();
    await exec(`zip -j ${output} ${this.tempFolder}*.txt`, { maxBuffer: Number.MAX_SAFE_INTEGER });
  }
}
