import {XMLStream} from "../xml/XMLStream";
import * as AdmZip from "adm-zip";
import {TransXChangeStream} from "../transxchange/TransXChangeStream";
import {parse} from "path";
import {Readable} from "stream";
import {GTFSFileStream} from "../gtfs/GTFSFileStream";
import {ZipReadStream} from "../input/ZipReadStream";
import {FileReadStream} from "../input/FileReadStream";
import autobind from "autobind-decorator";

/**
 * Converts the TransXChange input stream to a GTFS zip output stream
 */
@autobind
export class Converter {

  constructor(
    private readonly zipReadStream: ZipReadStream,
    private readonly fileReadStream: FileReadStream,
    private readonly xmlStream: XMLStream,
    private readonly transXChangeStream: TransXChangeStream,
    private readonly gtfsFiles: GTFSFiles,
    private readonly archive: AdmZip
  ) {}

  /**
   * Load the XML into memory, convert it to JSON, then a TransXChange object and the pass that to each of the GTFS file
   * factory methods.
   */
  public async process(input: string[], output: string): Promise<void> {
    // read the input files and start pumping them through to the XML stream
    this.processInput(input);

    this.zipReadStream.pipe(this.xmlStream);
    this.fileReadStream.pipe(this.xmlStream);
    this.xmlStream.pipe(this.transXChangeStream);

    // wait for all the zip files to finish
    await Object.entries(this.gtfsFiles).map(this.addFile);

    this.archive.writeZip(output);
  }

  private processInput(files: string[]): void {
    for (const file of files) {
      const extension = parse(file).ext;

      if (extension === "zip") {
        this.zipReadStream.write(file);
      }
      else if (extension === "xml") {
        this.xmlStream.write(file);
      }
      else {
        throw Error("Unknown file type: " + file);
      }
    }
  }

  private async addFile([filename, stream]: [string, GTFSFileStream]): Promise<void> {
    const buffer = await streamToBuffer(stream);

    this.archive.addFile(filename, buffer);
  }
}

/**
 * Convert a stream of strings to a buffer
 */
function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const lines: string[] = [];

    stream.on("data", data => lines.push(data));
    stream.on("end", () => resolve(Buffer.from(lines)));
    stream.on("error", reject);
  });
}

/**
 * GTFSFileStreams indexed by filename e.g. stops.txt => Stops
 */
export type GTFSFiles = Record<string, GTFSFileStream>;
