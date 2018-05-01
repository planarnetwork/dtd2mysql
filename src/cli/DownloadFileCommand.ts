import {CLICommand} from "./CLICommand";

import * as http from "http";
import * as fs from "fs";


export class DownloadFileCommand implements CLICommand {

  constructor(private readonly url: string) {}

  /**
   * Download the file from a HTTP server
   */
  public async run(argv: string[]): Promise<string[]> {
    console.log(`Downloading ${this.url}...`);

    const outputDirectory = argv[3] || "/tmp/";
    const filename = outputDirectory + "nfm64.zip";

    return new Promise<string[]>((resolve, reject) => {
      const file = fs.createWriteStream(filename);

      http.get(this.url, response => {
        response.pipe(file);

        file.on("error", reject);
        file.on("finish", () => {
          file.close();
          resolve([filename]);
        });
      });
    });
  }

}