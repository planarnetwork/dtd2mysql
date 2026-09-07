import * as fs from "fs";
import { GTFSLoader } from "./GTFSLoader";
import { GTFSOutputFactory } from "./GTFSOutputFactory";
import { ZipOutput } from "../zip/ZipOutput";


/**
 * Merges a list of input GTFS files into a single output file
 */
export class MergeCommand {

  constructor(
    private readonly gtfsLoader: GTFSLoader,
    private readonly outputFactory: GTFSOutputFactory,
    private readonly zipOutput: ZipOutput
  ) {}

  /**
   * Iterate over the list of inputs loading and merging each one at a time.
   */
  public async run(
    inputs: string[],
    outputFile: string,
    stopPrefix: string,
    filterDatesBefore?: string
  ): Promise<void> {
    const output = this.outputFactory.create();

    for (const input of inputs) {
      console.log("Loading " + input);
      const file = fs.createReadStream(input);
      const gtfs = await this.gtfsLoader.load(file, stopPrefix, filterDatesBefore);

      console.log("Processing " + input);
      await output.write(gtfs);
    }

    await output.end();
    await this.zipOutput.write(outputFile);
  }
}
