import {parse} from "csv-parse/sync";

/**
 * One row of the NaPTAN CSV, by column name.
 *
 * Deliberately not narrowed to a fixed set of fields: NaPTAN has around forty
 * columns, different consumers want different ones, and the file gains columns
 * between releases. Reading by name is the point - the alternative, which the
 * TransXChange conversion used to do, was to slice out positions
 * `[0,1,4,10,14,18,19,29,30]` and hope the DfT never reorders anything.
 */
export type NaptanRow = Record<string, string | undefined>;

/**
 * The rows of a NaPTAN CSV, optionally filtered.
 *
 * `relax_column_count` because NaPTAN's own export is not consistent about
 * trailing empty columns, and a short row is still a usable stop.
 */
export function parseNaptanRows(
  csv: string,
  filter?: (row: NaptanRow) => boolean
): NaptanRow[] {
  const rows: NaptanRow[] = parse(csv, {
    columns: true,
    bom: true,
    skip_empty_lines: true,
    relax_column_count: true
  });

  return filter === undefined ? rows : rows.filter(filter);
}
