import {CLICommand} from "./CLICommand";
import {PromiseSFTP} from "../sftp/PromiseSFTP";
import {FileEntry} from "ssh2-streams";

export class DownloadCommand implements CLICommand {

    constructor(
        private readonly sftp: PromiseSFTP,
        private readonly directory: string
    ) {}

    /**
     * Download the latest refresh file from an SFTP server
     */
    public async run(argv: string[]): Promise<string> {
      console.log("Connected to server");
      const outputDirectory = argv[3] || "/tmp/";
      const filename = await this.getLastFullRefresh();
      const from = this.directory + filename;
      const to = outputDirectory + filename;

      console.log(`Downloading ${filename}...`);

      try {
        await this.sftp.fastGet(from, to);
      }
      catch (err) {
        console.error(err);
      }

      console.log("Finished download");
      this.sftp.end();

      return to;
    }

  /**
   * Do a directory listing to get the filename of the last full refresh
   */
  private async getLastFullRefresh(): Promise<string> {
    const dir = await this.sftp.readdir(this.directory);

    dir.sort((a: FileEntry, b: FileEntry) => b.attrs.mtime - a.attrs.mtime);

    const item = dir.find(item => item.filename.charAt(4) === "F" || item.filename.startsWith("RJRG"));

    if (item) {
      return item.filename
    }
    else {
      throw new Error(`Could not find full refresh file in ${this.directory}`);
    }
  }

}

