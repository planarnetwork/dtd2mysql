import type {Page} from "./Filter.js";

/**
 * A filtered view, as something to take away.
 *
 * The point of the explorer is getting to the bottom of a data question, and the end of that is
 * usually a bug report. Nine rows pasted into an issue are worth more than a screenshot of them.
 */

/**
 * CSV, written the way the feed writes it, so what comes out can be read straight back in.
 *
 * Quoting matters more here than it looks. stop_headsign is the only field in a GB feed that
 * contains a comma - a dividing train is "Portsmouth Harbour, Southampton" - and an export that
 * wrote it bare would produce a file with one more column on that row than on any other.
 */
export function toCSV(page: Page): string {
  const lines = [page.header.join(",")];

  for (const {values} of page.rows) {
    lines.push(page.header.map(column => escape(values[column])).join(","));
  }

  return `${lines.join("\n")}\n`;
}

/**
 * JSON, for a reader who is going to do something with it rather than read it.
 *
 * The row number each row came from is carried, which the CSV cannot do without inventing a column.
 * It is what a finding is cited by.
 */
export function toJSON(page: Page): string {
  return `${JSON.stringify({
    file: page.file,
    matched: page.matched,
    total: page.total,
    rows: page.rows.map(({index, values}) => ({csvRowNumber: index + 2, ...values}))
  }, null, 2)}\n`;
}

/**
 * A field, quoted where it has to be.
 *
 * An absent value is written as an empty field rather than as the word undefined, which is what the
 * feed does and what reading it back would expect.
 */
function escape(value: string | undefined): string {
  if (value === undefined) {
    return "";
  }

  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, "\"\"")}"` : value;
}
