import {FeedRow, FileSchema} from "@gb-transit/gtfs-schema";
import {Transform, TransformCallback} from "node:stream";

/**
 * Turns TransXChange objects into the rows of one GTFS file.
 *
 * The file and its columns are declared once, as a FileSchema, and the rows are
 * objects. Before, each of these carried a `header` string and a `pushLine`
 * whose argument order had to match it, with nothing checking that it did - and
 * the schema was written down a third time in resource/schema.sql, which had
 * already drifted.
 *
 * Nothing here formats CSV. The header is not a stream's business either: the
 * writer emits it when the file is opened, so a stream that receives no chunks
 * now produces a file with a header and no rows rather than an empty file.
 */
export abstract class RowStream<T, R extends FeedRow> extends Transform {

  public abstract readonly file: FileSchema<R>;

  constructor() {
    super({objectMode: true});
  }

  public _transform(chunk: T, encoding: string, callback: TransformCallback): void {
    this.transform(chunk);

    callback();
  }

  /**
   * Extract the rows from the TransXChange object
   */
  protected abstract transform(data: T): void;

  protected pushRow(row: R): boolean {
    return this.push(row);
  }

}
