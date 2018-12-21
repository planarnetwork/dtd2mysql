import {Writable} from "stream";

/**
 * Uses the underlying Writable stream to output GTFS data
 */
export class GTFSFileStream {
  private headerSent = false;
  private seenKeys = {};

  constructor(
    private readonly stream: Writable,
    private readonly fields: string[],
    private readonly key: string | null = null
  ) { }

  /**
   * Write the given entity to the file stream
   */
  public write(data: any): void {
    if (!this.headerSent) {
      this.stream.write(this.fields.join() + "\n");

      this.headerSent = true;
    }

    const key = this.key ? data[this.key] : null;

    if (!key || !this.seenKeys[key]) {
      this.seenKeys[key] = true;

      this.stream.write(this.fields.map(f => data[f]).join() + "\n");
    }
  }

  /**
   * Close the stream
   */
  public end(): Promise<void> {
    return new Promise(resolve => this.stream.end(resolve));
  }

}
