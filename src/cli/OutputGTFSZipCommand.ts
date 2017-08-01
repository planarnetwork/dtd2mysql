
import {CLICommand} from "./CLICommand";
import {OutputGTFSCommand} from "./OutputGTFSCommand";
import * as fs from "fs";
import {execSync} from "child_process";

export class OutputGTFSZipCommand implements CLICommand {

  constructor(
    private readonly command: OutputGTFSCommand
  ) { }

  /**
   * Create the text files and then zip them up using a CLI command that hopefully exists.
   */
  public async run(argv: string[]): Promise<void> {
    const filename = argv[3] || "./gtfs.zip";

    argv[3] = "/tmp/gtfs/";

    if (!fs.existsSync(argv[3])) {
      fs.mkdirSync(argv[3]);
    }

    await this.command.run(argv);

    console.log("Writing " + filename);
    execSync(`zip ${filename} ${argv[3]}/*.txt`);
  }

}