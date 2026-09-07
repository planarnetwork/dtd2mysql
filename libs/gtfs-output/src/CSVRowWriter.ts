import {Columns, RowWriter} from "@gb-transit/gtfs-schema";
import {finished} from "node:stream/promises";
import {once} from "node:events";
import {Writable} from "stream";

/**
 * Rows of one file, as CSV, in the columns the producer declared.
 *
 * This replaces csv-write-stream, which took the header from the keys of the
 * first row it was given. That made the row type the file schema, so a row type
 * wide enough to serve two producers would have put one producer's columns into
 * the other's file - and a file that received no rows had no header at all,
 * because the header was written from inside the transform.
 *
 * The output is byte for byte what csv-write-stream produced, because the
 * committed golden feed is the record of what this repository publishes and
 * changing the writer is not a decision to change it.
 */
export class CSVRowWriter<R extends object> implements RowWriter<R> {

  constructor(
    private readonly columns: Columns<R>,
    private readonly out: Writable
  ) {
    // On construction rather than before the first row, so a file with no rows
    // is an empty table rather than an empty file.
    this.out.write(this.columns.map(field).join(",") + "\n");
  }

  public write(row: R): boolean {
    let line = "";

    for (let i = 0; i < this.columns.length; i++) {
      line += (i === 0 ? "" : ",") + field(row[this.columns[i]]);
    }

    return this.out.write(line + "\n");
  }

  public async drain(): Promise<void> {
    await once(this.out, "drain");
  }

  public end(): void {
    this.out.end();
  }

  /**
   * The file, not the writer: a writer finishes as soon as it has handed its
   * last row on, which is not when the row is on disk.
   */
  public finished(): Promise<void> {
    return finished(this.out);
  }

}

/**
 * One field, as csv-write-stream wrote it.
 *
 * Null and undefined are empty. Anything else is stringified, and quoted only
 * if it contains a comma, a quote or a newline, with its quotes doubled.
 */
export function field(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  return /[,\r\n"]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
}
