import {RowWriter} from "@gb-transit/gtfs-schema";

/**
 * A writer that drops a row whose key it has already written.
 *
 * Merging is where this matters and the only place it does, which is why it is
 * here rather than in the shared writer: two feeds that both serve a station
 * both describe it, and the merged feed wants one stops.txt row for it. That is
 * the point of merging a rail feed and a bus feed that agree on ATCO codes -
 * they meet at the stop, and without this they would meet as a duplicate key.
 *
 * The rail build has no use for it: every file it writes is sorted and unique by
 * construction, and a duplicate there would be a bug to fix rather than a row to
 * swallow.
 */
export class DedupingWriter<T> implements RowWriter<T> {

  private readonly seen = new Set<string>();

  constructor(
    private readonly writer: RowWriter<T>,
    private readonly key: (row: T) => string
  ) {}

  public write(row: T): boolean {
    const key = this.key(row);

    if (this.seen.has(key)) {
      return true;
    }

    this.seen.add(key);

    return this.writer.write(row);
  }

  public drain(): Promise<void> {
    return this.writer.drain();
  }

  public end(): void {
    this.writer.end();
  }

  public finished(): Promise<void> {
    return this.writer.finished();
  }

}
