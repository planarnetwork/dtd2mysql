import AdmZip from "adm-zip";
import * as os from 'node:os';
import * as path from 'node:path';
import {BuildFeed} from "@gb-rail/gtfs";
import * as fs from "fs";

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
   *
   * The zip is written in process and awaited, so this resolves when the file
   * exists rather than when a timer is due to start writing it, and a failure
   * fails the build instead of being thrown into an empty stack.
   */
  public async build(filename: string): Promise<void> {
    if (fs.existsSync(filename)) {
      fs.unlinkSync(filename);
    }

    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "gtfs"));

    try {
      await this.command.build(directory);

      console.log("Writing " + filename);

      // Flat, and in a fixed order: a GTFS feed is a directory of files at the
      // root of the archive, and the same feed should produce the same zip.
      const zip = new AdmZip();

      for (const file of fs.readdirSync(directory).sort()) {
        zip.addLocalFile(path.join(directory, file));
      }

      await zip.writeZipPromise(filename);
    }
    finally {
      fs.rmSync(directory, {recursive: true, force: true});
    }
  }

}
