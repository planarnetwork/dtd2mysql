import {FeedInfoRow, RowWriter} from "@gb-transit/gtfs-schema";
import {close, push} from "./Push";

/**
 * One feed_info.txt for a feed made of several.
 *
 * The file is where a feed says who made it, what it covers and which version
 * this is, and the validator warns without it. A merge wrote none at all, so a
 * merged feed could not say any of it.
 *
 * There is no answer here that is simply correct - two feeds have two publishers
 * and the merged one is neither - so what it writes is the least invented thing
 * available:
 *
 * The publisher is the first input's. Not a vote and not a join: a merged feed
 * is published by whoever ran the merge, and the first feed named on the command
 * line is the nearest thing to that this can see. **Anything publishing a merged
 * feed as its own should write this file itself rather than take what falls out
 * here.**
 *
 * The window is the widest of the inputs', because the merged feed covers a date
 * if any feed in it does.
 *
 * The version names every input's, joined, so a feed can be traced back to the
 * files it was built from.
 */
export class FeedInfoMerger {

  private publisher?: FeedInfoRow;
  private startDate?: string;
  private endDate?: string;
  private readonly versions: string[] = [];

  constructor(
    private readonly writer: RowWriter<FeedInfoRow>
  ) {}

  public write(rows: FeedInfoRow[]): void {
    for (const row of rows) {
      this.publisher ??= row;

      const {feed_start_date: start, feed_end_date: end} = row;

      if (start && (this.startDate === undefined || start < this.startDate)) {
        this.startDate = start;
      }

      if (end && (this.endDate === undefined || end > this.endDate)) {
        this.endDate = end;
      }

      if (row.feed_version) {
        this.versions.push(row.feed_version);
      }
    }
  }

  /**
   * Written at the end, because until every feed has been read there is no
   * knowing what the merged one covers. A merge of feeds that all lack the file
   * writes a header and no row, rather than a publisher nobody claimed.
   */
  public async end(): Promise<void> {
    if (this.publisher !== undefined) {
      await push(this.writer, {
        ...this.publisher,
        feed_start_date: this.startDate ?? this.publisher.feed_start_date,
        feed_end_date: this.endDate ?? this.publisher.feed_end_date,
        feed_version: this.versions.length > 0 ? this.versions.join("+") : null
      });
    }

    return close(this.writer);
  }

}
