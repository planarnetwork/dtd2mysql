
import {CLICommand} from "./CLICommand";

export class DownloadAndProcessCommand implements CLICommand {

  constructor(
    private readonly download: FileProvider,
    private readonly process: FileImporter
  ) {}

  /**
   * Download and process the feed in one command
   */
  public async run(argv: string[]): Promise<any> {
    const files = await this.download.run([]);

    for (const filename of files) {
      try {
        await this.process.doImport(filename);
      }
      catch (err) {
        console.error(err);
      }
    }

    return this.process.end();
  }

}

export interface FileProvider {
  run(args: any[]): Promise<string[]>;
}

export interface FileImporter {
  doImport(filePath: string): Promise<void>;
  end(): Promise<void>;
}
