import {Transform, TransformCallback} from "stream";
import {TransXChange} from "../transxchange/TransXChange";

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
      this.pushLine(this.header);
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
  public pushLine(data: string | null, encoding?: string): boolean {
    return this.push(data + "\n", encoding);
  }

}
