import {FileStream} from "./FileStream";
import autobind from "autobind-decorator";
import {Writable} from "stream";
import {Container} from "../Container";
import * as fs from "fs";
import {sync as rimraf} from "rimraf";
import { ZipFile } from "yazl";
import ReadableStream = NodeJS.ReadableStream;


/**
 * Converts the TransXChange input stream to a GTFS zip output stream
 */
@autobind
export class Converter {

  constructor(
    private readonly inputStream: FileStream,
    private readonly gtfsFiles: Record<string, ReadableStream>,
  ) {}

  /**
   * Load the XML into memory, convert it to JSON, then a TransXChange object and the pass that to each of the GTFS file
   * factory methods.
   */
  public async process(input: string[], output: string | undefined): Promise<void> {
    if (input.length === 0 || output === undefined) {
      throw Error("Invalid number of arguments");
    }

    this.init();
    this.pushInputFiles(input);

    const streams = Object
      .keys(this.gtfsFiles)
      .map(file => this.gtfsFiles[file].pipe(fs.createWriteStream(Container.TMP + file)));

    await this.streamsFinished(streams);

    const zipFile = new ZipFile();

    for (const file in this.gtfsFiles) {
      zipFile.addFile(Container.TMP + file, file);
    }

    zipFile.end();

    await this.writeToFile(zipFile.outputStream, output);

    console.log("Complete.");
    console.log(`Memory usage: ${Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100} MB`);
  }

  public init() {
    if (fs.existsSync(Container.TMP)) {
      rimraf(Container.TMP);
    }

    fs.mkdirSync(Container.TMP);
  }

  private pushInputFiles(input: string[]) {
    for (const file of input) {
      this.inputStream.write(file);
    }

    this.inputStream.end();
  }

  private streamsFinished(streams: Writable[]): Promise<any> {
    const promises = streams.map(s => new Promise((resolve, reject) => {
      s.on("finish", resolve);
      s.on("error", reject);
    }));

    return Promise.all(promises);
  }

  private writeToFile(outputStream: ReadableStream, output: string): Promise<void> {
    const stream = outputStream.pipe(fs.createWriteStream(output));

    return new Promise((resolve, reject) => {
      stream.on("close", resolve);
      stream.on("error", reject);
    });
  }
}

