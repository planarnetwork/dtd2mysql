import {CLICommand} from "./CLICommand";

import * as http from "http";
import * as https from "https";
import * as fs from "fs";


export class DownloadFileCommand implements CLICommand {

  constructor(private readonly url: string, private readonly name: string) {}

  /**
   * Download the file from a HTTP server
   */
  public async run(argv: string[]): Promise<string[]> {
    const outputDirectory = argv[3] || "/tmp/";
    const filename = outputDirectory + this.name;
    const client = this.url.match(/^https:/) ? https : http;

    console.log(`Downloading ${this.url} to ${filename}...`);

    return new Promise<string[]>((resolve, reject) => {
      const file = fs.createWriteStream(filename);

      client.get(this.url, response => {
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