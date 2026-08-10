/**
 * Remembers which feed file was processed last, so a download picks up where the
 * previous one stopped.
 *
 * This used to be a `SELECT * FROM log` inside DownloadCommand, which tied the
 * download path to MySQL. A one-shot GTFS build has no database, so the cursor
 * becomes something the caller supplies: the storage apps back it with their log
 * table, and a one-shot build uses NO_CURSOR and takes the latest full refresh
 * every time.
 */
export interface FeedCursor {

  /**
   * The name of the last feed file that was processed, or undefined if nothing
   * has been processed or the answer cannot be established.
   */
  getLastProcessedFile(): Promise<string | undefined>;

}

/**
 * Remembers nothing, so every run starts from the most recent full refresh.
 */
export const NO_CURSOR: FeedCursor = {
  getLastProcessedFile: async () => undefined
};
