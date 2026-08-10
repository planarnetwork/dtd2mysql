
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
    const filename = argv[3] || "./gtfs.zip";

    if (fs.existsSync(filename)) {
      fs.unlinkSync(filename);
    }
    
    argv[3] = fs.mkdtempSync(path.join(os.tmpdir(), "gtfs"));

    await this.command.run(argv);

    // when node tells you it's finished writing a file, it's lying.
    setTimeout(() => {
      console.log("Writing " + filename);
      processSpawnResult(spawnSync('zip', ['-jr', filename, argv[3]]));
      fs.rmSync(argv[3], {recursive: true});
    }, 1000);
  }

}
