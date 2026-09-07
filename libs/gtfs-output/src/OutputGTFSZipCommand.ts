import * as os from 'node:os';
import * as path from 'node:path';
import {BuildFeed} from "@gb-transit/gtfs";
import * as fs from "fs";
import {writeZip} from "./WriteZip";

export class OutputGTFSZipCommand {

  constructor(
    private readonly command: BuildFeed
  ) { }

  /**
   * The dtd2mysql CLI takes the zip filename as a positional argument
   */
  public async run(argv: string[]): Promise<void> {
    return this.build(argv[3] || "./gtfs.zip");
  }

  /**
   * Write the feed to a temporary directory and zip it up.
   */
  public async build(filename: string): Promise<void> {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "gtfs"));

    try {
      await this.command.build(directory);

      console.log("Writing " + filename);

      await writeZip(directory, filename);
    }
    finally {
      fs.rmSync(directory, {recursive: true, force: true});
    }
  }

}
