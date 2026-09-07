import * as fs from "fs";
import {deliverFeed} from "@gb-transit/gtfs-output";
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

    await deliverFeed(this.directory, outputFile);
  }
}
