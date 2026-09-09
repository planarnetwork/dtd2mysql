import {CSVParser} from "@gb-transit/gtfs-loader";
import type {EntrySink, Row} from "@gb-transit/gtfs-loader";
import {Dictionary} from "./Dictionary.js";

/**
 * One file of a feed, held as a column of dictionary indexes per field.
 *
 * Built from the header the file actually has rather than from the columns the schema knows, because
 * the explorer is pointed at feeds this repository did not write. A column nothing here has heard of
 * is held and shown as itself; deciding it is not worth keeping is the one thing a tool for looking
 * at a feed must not do.
 *
 * stop_times.txt does not come through here - it is 2.9 million rows and gets CallStore instead.
 */
export class ColumnStore {

  private readonly dictionaries: Dictionary[];
  private columns: Int32Array[];
  private capacity: number;

  public rows = 0;

  constructor(public readonly header: readonly string[], capacity = 1024) {
    this.capacity = Math.max(capacity, 1);
    this.dictionaries = header.map(() => new Dictionary());
    this.columns = header.map(() => new Int32Array(this.capacity));
  }

  /**
   * Take a row.
   *
   * The row object CSVParser hands over is reused between rows, so every field is interned here and
   * now. Nothing in this class keeps a reference to it.
   */
  public push(row: Row): void {
    if (this.rows === this.capacity) {
      this.grow();
    }

    for (let column = 0; column < this.header.length; column++) {
      this.columns[column][this.rows] = this.dictionaries[column].intern(row[this.header[column]]);
    }

    this.rows++;
  }

  /** The value in a cell by column position, for a caller already iterating the header. */
  public valueAt(column: number, row: number): string | undefined {
    return this.dictionaries[column].valueOf(this.columns[column][row]);
  }

  /** The value in a named cell, or undefined where the file has no such column. */
  public value(column: string, row: number): string | undefined {
    const index = this.header.indexOf(column);

    return index === -1 ? undefined : this.valueAt(index, row);
  }

  /** A whole row, as the object a view renders. */
  public row(index: number): Row {
    const row: Row = {};

    for (let column = 0; column < this.header.length; column++) {
      row[this.header[column]] = this.valueAt(column, index);
    }

    return row;
  }

  /**
   * The raw indexes of a column, for a scan that does not want to resolve every value it rejects.
   * Only valid up to `rows` - the array behind it is over-allocated.
   */
  public indexes(column: string): Int32Array | undefined {
    const index = this.header.indexOf(column);

    return index === -1 ? undefined : this.columns[index].subarray(0, this.rows);
  }

  /** The dictionary of a column, so a filter can resolve its term once rather than per row. */
  public dictionary(column: string): Dictionary | undefined {
    const index = this.header.indexOf(column);

    return index === -1 ? undefined : this.dictionaries[index];
  }

  /**
   * An index from a column's value to the rows holding it, for the joins every view does:
   * stops by parent_station, trips by route_id, calendar_dates by service_id.
   */
  public index(column: string): Map<string, number[]> {
    const indexes = this.indexes(column);
    const dictionary = this.dictionary(column);
    const rows = new Map<string, number[]>();

    if (indexes === undefined || dictionary === undefined) {
      return rows;
    }

    for (let row = 0; row < this.rows; row++) {
      const value = dictionary.valueOf(indexes[row]);

      if (value === undefined || value === "") {
        continue;
      }

      const existing = rows.get(value);

      if (existing === undefined) {
        rows.set(value, [row]);
      }
      else {
        existing.push(row);
      }
    }

    return rows;
  }

  private grow(): void {
    this.capacity = Math.ceil(this.capacity * 1.5);
    this.columns = this.columns.map(column => {
      const grown = new Int32Array(this.capacity);

      grown.set(column);

      return grown;
    });
  }

}

/**
 * A sink that reads a whole file into a ColumnStore, whatever columns it turns out to have.
 *
 * CSVParser needs its column list up front, so the first line is buffered here to find out what it
 * is, and then the buffered text is handed over whole - header line included, which the parser reads
 * as its own header. The file is not parsed twice; only its first line is split twice.
 */
export function columnStoreSink(
  onDone: (store: ColumnStore) => void,
  capacity?: number
): EntrySink {
  let parser: CSVParser | undefined;
  let store: ColumnStore | undefined;
  let pending = "";

  return (text, final) => {
    if (parser === undefined) {
      pending += text;

      const newline = pending.indexOf("\n");

      if (newline === -1 && !final) {
        return; // the header is longer than this chunk, which a tiny first chunk can do
      }

      const line = newline === -1 ? pending : pending.slice(0, newline);

      store = new ColumnStore(splitHeader(line), capacity);
      parser = new CSVParser(store.header, row => (store as ColumnStore).push(row));
      text = pending;
      pending = "";
    }

    parser.write(text);

    if (final) {
      parser.end();
      onDone(store as ColumnStore);
    }
  };
}

/**
 * The column names of a header line.
 *
 * Quoted, because nothing stops a feed from quoting a header even though none in practice does, and
 * a parser that assumed otherwise would name a column `"stop_id` and then never match it.
 */
export function splitHeader(line: string): string[] {
  const text = line.endsWith("\r") ? line.slice(0, -1) : line;
  const columns: string[] = [];

  let at = 0;

  while (at <= text.length) {
    if (text.charAt(at) === "\"") {
      let closing = at + 1;

      while (closing < text.length) {
        if (text.charAt(closing) === "\"" && text.charAt(closing + 1) !== "\"") {
          break;
        }

        closing += text.charAt(closing) === "\"" ? 2 : 1;
      }

      columns.push(text.slice(at + 1, closing).replace(/""/g, "\""));

      const comma = text.indexOf(",", closing + 1);

      at = comma === -1 ? text.length + 1 : comma + 1;
    }
    else {
      const comma = text.indexOf(",", at);
      const to = comma === -1 ? text.length : comma;

      columns.push(text.slice(at, to));
      at = to + 1;
    }
  }

  // TextDecoder strips the byte order mark, but a caller writing text it decoded itself may not have
  if (columns.length > 0 && columns[0].charCodeAt(0) === 0xfeff) {
    columns[0] = columns[0].slice(1);
  }

  return columns;
}
