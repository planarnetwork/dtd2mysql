import {CLICommand} from "./CLICommand";
import {PromiseSFTP} from "../sftp/PromiseSFTP";
import {FileEntry} from "ssh2-streams";
import {DatabaseConnection} from "../database/DatabaseConnection";

export class DownloadCommand implements CLICommand {

  constructor(
    private readonly db: DatabaseConnection,
    private readonly sftp: PromiseSFTP,
    private readonly directory: string
  ) {}

  /**
   * Download the latest refresh file from an SFTP server
   */
  public async run(argv: string[]): Promise<string[]> {
    console.log("Connected to server");
    const outputDirectory = argv[3] || "/tmp/";
    const [remoteFiles, lastProcessedFile] = await Promise.all([
      this.sftp.readdir(this.directory),
      this.getLastProcessedFile()
    ]);

    const files = this.getFilesToProcess(remoteFiles, lastProcessedFile);

    try {
      await Promise.all(
        files.map(filename => {
          console.log(`Downloading ${filename}...`);

          return this.sftp.fastGet(this.directory + filename, outputDirectory + filename);
        })
      );
    }
    catch (err) {
      console.error(err);
    }

    console.log("Finished download");
    this.sftp.end();

    return files.map(filename => outputDirectory + filename);
  }

  private async getLastProcessedFile(): Promise<string | undefined> {
    try {
      const [[log]] = await this.db.query("SELECT * FROM log ORDER BY id DESC LIMIT 1");

      return log ? log.filename : undefined;
    }
    catch (err) {
      return undefined;
    }
  }
  /**
   * Do a directory listing to get the filename of the last full refresh
   */
  private getFilesToProcess(dir: FileEntry[], lastProcessed: string | undefined): string[] {
    dir.sort((a: FileEntry, b: FileEntry) => b.attrs.mtime - a.attrs.mtime);

    const lastRefresh = dir.findIndex(i => i.filename.charAt(4) === "F" || i.filename.startsWith("RJRG"));
    const lastFile = dir.findIndex(i => i.filename === lastProcessed);
    const files = lastFile > -1 && lastFile <= lastRefresh ? dir.slice(0, lastFile) : dir.slice(0, lastRefresh + 1);

    return files.map(f => f.filename).reverse();
  }

}

