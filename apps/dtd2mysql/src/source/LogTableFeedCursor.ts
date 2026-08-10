import {FeedCursor} from "@gb-rail/dtd-source";
import {DatabaseConnection} from "../database/DatabaseConnection";

interface LogEntry {
  id: number,
  filename: string | null,
  processed: string | null,
}

/**
 * The last processed file as recorded by ImportFeedCommand in the log table.
 *
 * This is the query DownloadCommand used to run inline. A missing table or an
 * empty log both mean "start from the most recent full refresh", which is why
 * the error is swallowed rather than reported.
 */
export class LogTableFeedCursor implements FeedCursor {

  constructor(private readonly db: DatabaseConnection) {}

  public async getLastProcessedFile(): Promise<string | undefined> {
    try {
      const [[log]] = await this.db.query<LogEntry>("SELECT * FROM log ORDER BY id DESC LIMIT 1");

      return log.filename !== null ? log.filename : undefined;
    }
    catch (err) {
      return undefined;
    }
  }

}
