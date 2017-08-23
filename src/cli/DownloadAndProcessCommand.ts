
import {CLICommand} from "./CLICommand";
import {DownloadCommand} from "./DownloadCommand";
import {ImportFeedCommand} from "./ImportFeedCommand";

export class DownloadAndProcessCommand implements CLICommand {

  constructor(
    private readonly download: DownloadCommand,
    private readonly process: ImportFeedCommand
  ) {}

  /**
   * Download and process the feed in one command
   */
  public async run(argv: string[]): Promise<any> {
    const filename = await this.download.run([]);

    return this.process.run(["", "", "", filename]);
  }

}