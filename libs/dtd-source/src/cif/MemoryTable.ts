import {FieldValue, ParsedRecord, Record, RecordAction, TextField, VariableLengthText} from "@gb-transit/feed-parser";

export type Row = { [field: string]: FieldValue };

/**
 * As much of a database table as reading the feed files directly needs: a unique
 * key over `record.key`, INSERT IGNORE on a duplicate, REPLACE on a revision, and
 * an auto-increment `id` where the record does not supply one.
 *
 * A record with no key - ALF is one - simply accumulates, so importing the same
 * ALF three times leaves three copies of every link.
 */
export class MemoryTable {

  private readonly keyed = new Map<string, Row>();
  private readonly unkeyed: Row[] = [];
  private autoIncrement = 0;

  constructor(private readonly record: Record) {}

  public apply(parsed: ParsedRecord): void {
    const values = charColumns(this.record, parsed.values);

    if (this.record.key.length === 0) {
      if (parsed.action !== RecordAction.Delete) {
        this.unkeyed.push(this.withId(values));
      }

      return;
    }

    const key = this.keyOf(values);

    switch (parsed.action) {
      case RecordAction.Delete:
        this.keyed.delete(key);
        return;

      case RecordAction.Update:
        // REPLACE INTO: the old row goes and the new one takes a new id
        this.keyed.delete(key);
        this.keyed.set(key, this.withId(values));
        return;

      case RecordAction.Insert:
        // INSERT IGNORE: first one wins
        if (!this.keyed.has(key)) {
          this.keyed.set(key, this.withId(values));
        }

        return;

      default:
        // DelayedInsert is an insert the importer holds back until the end. No
        // record in the timetable feeds produces one, and guessing at it would
        // be worse than saying so.
        throw new Error(`${this.record.name} produced a ${parsed.action} record, which is not handled`);
    }
  }

  /**
   * Look a row up by its key fields, in the order the record declares them.
   */
  public get(...key: FieldValue[]): Row | undefined {
    return this.keyed.get(keyFor(key));
  }

  public get rows(): Row[] {
    return this.record.key.length === 0 ? this.unkeyed : [...this.keyed.values()];
  }

  private keyOf(values: Row): string {
    return keyFor(this.record.key.map(field => values[field]));
  }

  private withId(values: Row): Row {
    return values.id === null || values.id === undefined
      ? {...values, id: ++this.autoIncrement}
      : values;
  }

}

function keyFor(values: FieldValue[]): string {
  return JSON.stringify(values);
}

/**
 * MySQL stores a TextField as CHAR and strips trailing spaces when reading it
 * back; a VariableLengthText is VARCHAR and keeps them.
 *
 * The difference is load-bearing: stop activities are VARCHAR and are read two
 * characters at a time, so "T " has to survive.
 */
export function charColumns(record: Record, values: Row): Row {
  const trimmed: Row = {};

  for (const [name, value] of Object.entries(values)) {
    const field = record.fields[name];

    trimmed[name] = typeof value === "string"
      && field instanceof TextField
      && !(field instanceof VariableLengthText)
      ? value.replace(/ +$/, "")
      : value;
  }

  return trimmed;
}
