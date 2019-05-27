import {Transform, TransformCallback} from "stream";

/**
 * Uses the underlying Writable stream to output GTFS data
 */
export class GTFSFileStream extends Transform {
  private headerSent = false;
  private seenKeys = {};

  constructor(
    private readonly fields: string[],
    private readonly key: string | null = null
  ) {
    super({ encoding: "utf8", objectMode: true });
  }

  /**
   * Write the given entity to the file stream
   */
  public _transform(data: any, encoding: string, callback: TransformCallback): void {
    if (!this.headerSent) {
      this.push(this.fields.join() + "\n");

      this.headerSent = true;
    }

    const key = this.key ? data[this.key] : null;

    if (!key || !this.seenKeys[key]) {
      this.seenKeys[key] = true;
      const fields = this.fields.map(f => this.quote(data[f]));

      this.push(fields.join() + "\n");
    }

    callback();
  }

  private quote(text: string | number | undefined) {
    return typeof text === "string" && text.includes(",") ? "\"" + text + "\"" : text;
  }

}

