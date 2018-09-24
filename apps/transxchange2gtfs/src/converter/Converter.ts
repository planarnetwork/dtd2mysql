import * as AdmZip from "adm-zip";
import {GTFSFileStream} from "../gtfs/GTFSFileStream";
import {FileStream} from "./FileStream";
import autobind from "autobind-decorator";
import {Readable} from "stream";
import {TransXChangeJourney} from "../transxchange/TransXChangeJourneyStream";
import {TransXChange} from "../transxchange/TransXChange";

/**
 * Converts the TransXChange input stream to a GTFS zip output stream
 */
@autobind
export class Converter {

  constructor(
    private readonly fileStream: FileStream,
    private readonly gtfsFiles: GTFSFiles,
    private readonly archive: AdmZip
  ) {}

  /**
   * Load the XML into memory, convert it to JSON, then a TransXChange object and the pass that to each of the GTFS file
   * factory methods.
   */
  public async process(input: string[], output: string | undefined): Promise<void> {
    if (input.length === 0 || output === undefined) {
      throw Error("Invalid number of arguments");
    }

    this.pushInputFiles(input);

    // wait for all the zip files to finish
    await Promise.all(Object.entries(this.gtfsFiles).map(this.addFile));

    this.archive.writeZip(output);

    console.log(`Memory usage: ${Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100} MB`);
  }

  private pushInputFiles(input: string[]) {
    for (const file of input) {
      this.fileStream.write(file);
    }

    this.fileStream.end();
  }

  private async addFile([filename, stream]: [string, Readable]): Promise<void> {
    const text = await streamToString(stream);

    this.archive.addFile(filename, Buffer.from(text));
  }

}

/**
 * Convert a stream of lines to a single string with \n characters
 */
function streamToString(stream: Readable): Promise<string> {
  return new Promise((resolve, reject) => {
    let output = "";

    stream.on("data", data => output += data + "\n");
    stream.on("end", () => resolve(output));
    stream.on("error", reject);
  });
}

/**
 * GTFSFileStreams indexed by filename e.g. stops.txt => Stops
 */
export type GTFSFiles = Record<string, GTFSFileStream<TransXChange | TransXChangeJourney>>;
