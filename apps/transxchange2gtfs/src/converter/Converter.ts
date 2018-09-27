import {FileStream} from "./FileStream";
import autobind from "autobind-decorator";
import {promisify} from "util";
import {Writable} from "stream";
import {Container} from "../Container";

const exec = promisify(require("child_process").exec);

/**
 * Converts the TransXChange input stream to a GTFS zip output stream
 */
@autobind
export class Converter {

  constructor(
    private readonly inputStream: FileStream,
    private readonly outputStreams: Writable[],
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

    await this.streamsFinished();
    await exec(`zip -j ${output} ${Container.TMP}*.txt`);

    console.log(`Memory usage: ${Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100} MB`);
  }

  private pushInputFiles(input: string[]) {
    for (const file of input) {
      this.inputStream.write(file);
    }

    this.inputStream.end();
  }

  private streamsFinished(): Promise<any> {
    const streams = Object.values(this.outputStreams);
    const promises = streams.map(s => new Promise(resolve => s.on("finish", resolve)));

    return Promise.all(promises);
  }

}

