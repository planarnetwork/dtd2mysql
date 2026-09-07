import {Columns} from "./Columns.js";
import {FeedRow} from "../entity/FeedRow.js";

/**
 * Somewhere to put the rows of one file.
 *
 * Not a `Writable`. A `Writable.write` takes `any`, which is how a row for the
 * wrong file reaches the wrong stream and still compiles; the row type here is
 * fixed when the file is opened.
 */
export interface RowWriter<R> {

  /**
   * Write a row. False means the buffer is full and the caller should await
   * `drain()` before writing more.
   */
  write(row: R): boolean;

  /**
   * Resolves when the writer is ready for more rows.
   */
  drain(): Promise<void>;

  /**
   * No more rows.
   */
  end(): void;

  /**
   * Resolves when everything written has reached its destination - which is not
   * the same moment as the last row being handed on.
   */
  finished(): Promise<void>;
}

export interface GTFSOutput {

  /**
   * Open a file to write rows to, in the columns given.
   *
   * The columns are the producer's, not the rows': two producers write the same
   * file with different columns of it, and a file with no rows still has a
   * header. Anything the columns do not name is not written, so a row type wide
   * enough to serve several producers cannot leak a column into a file that
   * never had one.
   */
  open<R extends FeedRow>(filename: string, columns: Columns<R>): RowWriter<R>;

  /**
   * Write a whole file at once, for the things that are not rows.
   *
   * provenance.json is a document, not a table: nesting it into columns
   * produced a file of `[object Object]`. Anything with a shape belongs here
   * rather than being forced through the CSV writer.
   */
  write(filename: string, contents: string): void | Promise<void>;

  /**
   * Resolves when everything opened has reached its destination.
   */
  end(): void | Promise<void>;

}
