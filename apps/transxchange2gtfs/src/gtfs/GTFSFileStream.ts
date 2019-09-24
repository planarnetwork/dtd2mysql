import {Transform, TransformCallback} from "stream";

/**
 * Transform TransXChange objects into GTFS CSV lines
 */
export abstract class GTFSFileStream<T> extends Transform {
  private headerSent = false;
  protected abstract header: string;

  constructor() {
    super({ objectMode: true });
  }

  /**
   * Emit the header if necessary then pass the chunk to the transform method
   */
  public _transform(chunk: T, encoding: string, callback: TransformCallback): void {
    if (!this.headerSent) {
      this.push(this.header + "\n");
      this.headerSent = true;
    }

    this.transform(chunk);

    callback();
  }

  /**
   * Extract the records from the TransXChange object
   */
  protected abstract transform(data: T): void;

  /**
   * Add a new line to whatever is being pushed
   */
  public pushLine(...data: Array<string | number>): boolean {
    const line = data.map(this.quote).join(",");

    return this.push(line + "\n");
  }

  private quote(value: string | number): string {
    return typeof value === "string"
        ? value.includes(",") ? "\"" + value + "\"" : value
        : value + "";
  }

}
