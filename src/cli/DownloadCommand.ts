import * as SFTP from "ssh2-sftp-client";
import {CLICommand} from "./CLICommand";
import * as fs from "fs";

export class DownloadCommand implements CLICommand {

    constructor(
        private readonly sftp: SFTP,
        private readonly directory: string
    ) {}

    /**
     * Download the latest refresh file from an SFTP server
     */
    public async run(argv: string[]): Promise<string> {
      console.log("Connected to server");
      const outputDirectory = argv[3] || "/tmp/";
      const filename = await this.getLastFullRefresh();
      const outputStream = fs.createWriteStream(outputDirectory + filename, { encoding: 'binary' });
      const inputStream = await this.sftp.get(this.directory + filename, false, 'binary');

      console.log(`Downloading ${filename}...`);
      inputStream.pipe(outputStream);

      // wait until the write has finished before resolving the promise
      return new Promise<string>((resolve, reject) => {
        outputStream.on("error", reject);
        outputStream.on("finish", () => {
          console.log("Finished download");

          this.sftp.end().then(() => resolve(outputDirectory + filename));
        });
      });
    }

  /**
   * Do a directory listing to get the filename of the last full refresh
   */
  private async getLastFullRefresh(): Promise<string> {
      const dir: DirectoryListingItem[] = await this.sftp.list(this.directory);

      dir.sort(sortByDate);

      const item = dir.find(item => item.name.charAt(4) === "F" || item.name.startsWith("RJRG"));

      if (item) {
        return item.name
      }
      else {
        throw new Error(`Could not find full refresh file in ${this.directory}`);
      }
    }
}

function sortByDate(a: DirectoryListingItem, b: DirectoryListingItem): number {
  return b.modifyTime - a.modifyTime;
}

interface DirectoryListingItem {
  modifyTime: number;
  name: string;
}
