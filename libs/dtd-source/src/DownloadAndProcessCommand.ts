
export class DownloadAndProcessCommand {

  constructor(
    private readonly download: FileProvider,
    private readonly process: FeedProcessor
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

/**
 * Whatever consumes a downloaded feed file. The storage apps pass their
 * ImportFeedCommand; a one-shot build passes something that never touches a
 * database, which is the point of keeping the type structural.
 */
export interface FeedProcessor {
  doImport(filename: string): Promise<any>;
  end(): Promise<any>;
}