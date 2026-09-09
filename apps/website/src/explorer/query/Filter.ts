import type {Row} from "@gb-transit/gtfs-loader";
import type {Filters} from "../route.js";
import type {Table} from "./Table.js";

/**
 * Sorting is refused above this many matched rows.
 *
 * Ordering two million rows takes about a second and produces a sequence nobody is going to read.
 * Saying "filter first" is a better answer than spending the second, and the default order - file
 * order - is the meaningful one anyway: trips are contiguous and calls are in calling order.
 */
export const SORT_LIMIT = 500000;

export interface Query {
  readonly file: string;
  readonly filters: Filters;
  readonly sort?: string;
  readonly descending?: boolean;
  readonly offset: number;
  readonly limit: number;
}

export interface Page {
  readonly file: string;
  readonly header: readonly string[];
  readonly notHeld: readonly string[];
  /** Rows of this page, with the row number each came from so a link can name it. */
  readonly rows: readonly {index: number, values: Row}[];
  /** How many rows matched, which is not how many are on this page. */
  readonly matched: number;
  readonly total: number;
  readonly offset: number;
  /** Set when the sort was refused, with the reason, rather than silently ignored. */
  readonly sortRefused?: string;
}

/**
 * Run a query.
 *
 * The whole trick is in `matching`: a filter is resolved against the column's dictionary first, so
 * scanning 2.9 million rows is scanning integers rather than comparing strings. On the GB feed that
 * is the difference between 15 ms and 300, which is the difference between a filter you type into
 * and one you wait for.
 */
export function run(table: Table, query: Query): Page {
  const matched = matching(table, query.filters);
  const sortable = matched.length <= SORT_LIMIT;
  const ordered = query.sort !== undefined && sortable
    ? sorted(table, matched, query.sort, query.descending === true)
    : matched;

  const page = ordered.slice(query.offset, query.offset + query.limit);

  return {
    file: query.file,
    header: table.header,
    notHeld: table.notHeld ?? [],
    rows: page.map(index => ({index, values: table.row(index)})),
    matched: matched.length,
    total: table.rows,
    offset: query.offset,
    ...(query.sort !== undefined && !sortable
      ? {sortRefused: `${matched.length.toLocaleString("en-GB")} rows is too many to order. `
        + "Filter them down first."}
      : {})
  };
}

/**
 * The rows matching every filter, in file order.
 *
 * Filters are applied narrowest-first only in the sense that each one runs over what the last left,
 * so the expensive column is scanned over fewer rows than the cheap one.
 */
export function matching(table: Table, filters: Filters): number[] {
  const terms = Object.entries(filters).filter(([, term]) => term.length > 0);

  if (terms.length === 0) {
    return range(table.rows);
  }

  let rows: number[] | undefined;

  for (const [column, term] of terms) {
    rows = apply(table, column, term, rows);
  }

  return rows ?? [];
}

function apply(table: Table, column: string, term: string, within: number[] | undefined): number[] {
  const found: number[] = [];
  const indexes = table.indexes?.(column);
  const dictionary = table.dictionary?.(column);
  const lower = term.toLowerCase();

  if (indexes !== undefined && dictionary !== undefined) {
    // The fast path. The term is tested against the few thousand distinct values rather than the few
    // million rows, and the scan that follows is a lookup in a byte array.
    const mask = dictionary.search(value => value.toLowerCase().includes(lower));

    if (within === undefined) {
      for (let row = 0; row < table.rows; row++) {
        const index = indexes[row];

        if (index >= 0 && mask[index] === 1) {
          found.push(row);
        }
      }
    }
    else {
      for (const row of within) {
        const index = indexes[row];

        if (index >= 0 && mask[index] === 1) {
          found.push(row);
        }
      }
    }

    return found;
  }

  // The general path, for a column with no dictionary behind it: a time, a sequence number. Slower
  // per row, and only ever reached on columns whose values are cheap to produce.
  const test = (row: number) => {
    const value = table.value(column, row);

    return value !== undefined && value.toLowerCase().includes(lower);
  };

  if (within === undefined) {
    for (let row = 0; row < table.rows; row++) {
      if (test(row)) {
        found.push(row);
      }
    }
  }
  else {
    for (const row of within) {
      if (test(row)) {
        found.push(row);
      }
    }
  }

  return found;
}

/**
 * Order rows by a column.
 *
 * Numerically where every value in the page is a number, so stop_sequence 10 sorts after 9 rather
 * than between 1 and 2, and lexically otherwise. A missing value sorts last either way, because a
 * column of blanks at the top is not what anybody meant by sorting.
 */
function sorted(table: Table, rows: number[], column: string, descending: boolean): number[] {
  const values = new Map<number, string | undefined>();

  let numeric = true;

  for (const row of rows) {
    const value = table.value(column, row);

    values.set(row, value);

    if (numeric && value !== undefined && value.length > 0 && !Number.isFinite(Number(value))) {
      numeric = false;
    }
  }

  const compare = (a: number, b: number): number => {
    const left = values.get(a);
    const right = values.get(b);

    if (left === right) {
      return a - b; // file order, so the sort is stable and repeatable
    }
    if (left === undefined || left === "") {
      return 1;
    }
    if (right === undefined || right === "") {
      return -1;
    }

    return numeric ? Number(left) - Number(right) : left.localeCompare(right);
  };

  const ordered = [...rows].sort(descending ? (a, b) => compare(b, a) : compare);

  return ordered;
}

function range(length: number): number[] {
  const rows = new Array<number>(length);

  for (let row = 0; row < length; row++) {
    rows[row] = row;
  }

  return rows;
}
