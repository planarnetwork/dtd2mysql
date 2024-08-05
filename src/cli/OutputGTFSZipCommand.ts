
import {CLICommand} from "./CLICommand";
import {OutputGTFSCommand} from "./OutputGTFSCommand";
import * as fs from "fs";
import {execSync} from "child_process";
import * as path from "path";

export class OutputGTFSZipCommand implements CLICommand {

  constructor(
    private readonly command: OutputGTFSCommand
  ) { }

  /**
   * Create the text files and then zip them up using a CLI command that hopefully exists.
   */
  public async run(argv: string[]): Promise<void> {
    const filename = argv[3] || "./gtfs.zip";

    if (fs.existsSync(filename)) {
      fs.unlinkSync(filename);
    }

    argv[3] = "/tmp/gtfs/";

    if (fs.existsSync(argv[3])) {
      for (const entry of fs.readdirSync(argv[3])) {
        fs.rmSync(path.join(argv[3], entry), { recursive: true });
      }
    } else {
      fs.mkdirSync(argv[3]);
    }

    await this.command.run(argv);

    // when node tells you it's finished writing a file, it's lying.
    setTimeout(() => {
      console.log("Writing " + filename);
      try {
        execSync(`zip -j ${filename} ${argv[3]}/*.txt`);
      } catch (err) {
        const dec = new TextDecoder();
        console.error("STDOUT:");
        console.error(dec.decode(err.stdout));
        console.error("STDERR:");
        console.error(dec.decode(err.stderr));
        throw err;
      }
    }, 1000);
  }

}