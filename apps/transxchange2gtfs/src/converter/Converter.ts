import {GTFSFileStream} from "../gtfs/GTFSFileStream";
import {FileStream} from "./FileStream";
import autobind from "autobind-decorator";
import {TransXChangeJourney} from "../transxchange/TransXChangeJourneyStream";
import {TransXChange} from "../transxchange/TransXChange";
import * as fs from "fs";
import {promisify} from "util";
import {sync as rimraf} from "rimraf";

const exec = promisify(require("child_process").exec);

/**
 * Converts the TransXChange input stream to a GTFS zip output stream
 */
@autobind
export class Converter {
  public static readonly TMP = "/tmp/transxchange2gtfs/";

  constructor(
    private readonly fileStream: FileStream,
    private readonly gtfsFiles: GTFSFiles,
  ) {}

  /**
   * Load the XML into memory, convert it to JSON, then a TransXChange object and the pass that to each of the GTFS file
   * factory methods.
   */
  public async process(input: string[], output: string | undefined): Promise<void> {
    if (input.length === 0 || output === undefined) {
      throw Error("Invalid number of arguments");
    }

    this.setupTmp();

    for (const filename in this.gtfsFiles) {
      this.gtfsFiles[filename].pipe(fs.createWriteStream(Converter.TMP + filename));
    }

    this.pushInputFiles(input);

    await this.streamsFinished();
    await exec(`zip -j ${output} ${Converter.TMP}*.txt`);

    console.log(`Memory usage: ${Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100} MB`);
  }

  private setupTmp(): void {
    if (fs.existsSync(Converter.TMP)) {
      rimraf(Converter.TMP);
    }

    fs.mkdirSync(Converter.TMP);
  }

  private pushInputFiles(input: string[]) {
    for (const file of input) {
      this.fileStream.write(file);
    }

    this.fileStream.end();
  }

  private streamsFinished(): Promise<any> {
    const streams = Object.values(this.gtfsFiles);
    const promises = streams.map(s => new Promise(resolve => s.on("end", resolve)));

    return Promise.all(promises);
  }

}

/**
 * GTFSFileStreams indexed by filename e.g. stops.txt => Stops
 */
export type GTFSFiles = Record<string, GTFSFileStream<TransXChange | TransXChangeJourney>>;
