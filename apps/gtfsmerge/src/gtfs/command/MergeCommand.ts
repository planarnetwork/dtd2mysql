import {loadGTFS} from "../input/loadGTFS";
import {exec} from "child_process";
import {MergedGTFS} from "../MergedGTFS";


/**
 * Merges a list of input GTFS files into a single output file
 */
export class MergeCommand {

  constructor(
    private readonly mergedGTFS: MergedGTFS
  ) {}

  /**
   * Iterate over the list of inputs loading and merging each one at a time.
   */
  public async run(inputs: string[], output: string, tmp: string, stopPrefix: string): Promise<void> {
    for (const input of inputs) {
      console.log("Loading " + input);
      const gtfs = await loadGTFS(input, stopPrefix);

      console.log("Processing " + input);
      this.mergedGTFS.merge(gtfs);
    }

    console.log("Writing" + output);
    await this.mergedGTFS.end();
    await exec(`zip -j ${output} ${tmp}*.txt`, { maxBuffer: Number.MAX_SAFE_INTEGER });
  }
}
