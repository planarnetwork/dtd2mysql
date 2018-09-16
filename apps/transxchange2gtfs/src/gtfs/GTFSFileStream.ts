import {Transform, TransformCallback} from "stream";
import {TransXChange} from "../transxchange/TransXChange";

/**
 * Transform TransXChange objects into GTFS CSV lines
 */
export abstract class GTFSFileStream extends Transform {
  private headerSent = false;
  protected abstract header: string;

  constructor() {
    super({ objectMode: true });
  }

  /**
   * Emit the header if necessary then pass the chunk to the transform method
   */
  public _transform(chunk: TransXChange, encoding: string, callback: TransformCallback): void {
    if (!this.headerSent) {
      this.push(this.header);
      this.headerSent = true;
    }

    this.transform(chunk);

    callback();
  }

  /**
   * Extract the records from the TransXChange object
   */
  protected abstract transform(data: TransXChange): void;

}
