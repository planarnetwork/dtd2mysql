
import {CLICommand} from "./CLICommand";
import {ImportFeedCommand} from "./ImportFeedCommand";

export class DownloadAndProcessCommand implements CLICommand {

  constructor(
    private readonly download: FileProvider,
    private readonly process: ImportFeedCommand
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
