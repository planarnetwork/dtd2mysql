import * as fs from "fs";
import {writeZip} from "@gb-transit/gtfs-output";
import {readMergeInput} from "./FeedIndex";
import {GTFSOutputFactory} from "./GTFSOutputFactory";

/**
 * Merges a list of input GTFS files into a single output file
 */
export class MergeCommand {

  constructor(
    private readonly outputFactory: GTFSOutputFactory,
    private readonly directory: string
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
      const gtfs = await readMergeInput(input, stopPrefix, filterDatesBefore);

      console.log("Processing " + input);
      await output.write(gtfs);
    }

    await output.end();

    console.log("Writing " + outputFile);

    if (outputFile.endsWith(".zip")) {
      await writeZip(this.directory, outputFile);
      fs.rmSync(this.directory, {recursive: true, force: true});
    }
    else {
      // A directory of files, which is what the end to end tests and anything
      // piping this into another tool want.
      fs.rmSync(outputFile, {recursive: true, force: true});
      fs.renameSync(this.directory, outputFile);
    }
  }
}
