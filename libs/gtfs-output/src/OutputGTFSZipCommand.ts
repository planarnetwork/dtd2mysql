
import * as os from 'node:os';
import * as path from 'node:path';
import {processSpawnResult} from "./processSpawnResult";
import {BuildFeed} from "@gb-rail/gtfs";
import * as fs from "fs";
import {spawnSync} from "child_process";

export class OutputGTFSZipCommand {

  constructor(
    private readonly command: BuildFeed
  ) { }

  /**
   * Create the text files and then zip them up using a CLI command that hopefully exists.
   */
  public async run(argv: string[]): Promise<void> {
    return this.build(argv[3] || "./gtfs.zip");
  }

  /**
   * Create the text files and then zip them up using a CLI command that hopefully exists.
   */
  public async build(filename: string): Promise<void> {

    if (fs.existsSync(filename)) {
      fs.unlinkSync(filename);
    }
    
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "gtfs"));

    await this.command.build(directory);

    // when node tells you it's finished writing a file, it's lying.
    setTimeout(() => {
      console.log("Writing " + filename);
      processSpawnResult(spawnSync('zip', ['-jr', filename, directory]));
      fs.rmSync(directory, {recursive: true});
    }, 1000);
  }

}
