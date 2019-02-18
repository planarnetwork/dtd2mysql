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
      const fields = this.fields.map(f => quote(data[f]));

      this.stream.write(fields.join() + "\n");
    }
  }

  /**
   * Close the stream
   */
  public end(): Promise<void> {
    return new Promise(resolve => this.stream.end(resolve));
  }

}

function quote(text: string | number | undefined) {
  return typeof text === "string" && text.includes(",") ? "\"" + text + "\"" : text;
}
