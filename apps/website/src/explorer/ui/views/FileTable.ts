import type {Page} from "../../query/Filter.js";
import type {Route} from "../../route.js";
import {format} from "../../route.js";
import {csvRowNumberOf} from "../../model/FeedIndex.js";
import {number} from "../../format.js";
import {cell, escape} from "../dom.js";

/** How many rows a page shows. Enough to see a pattern, few enough to stay a table. */
export const PAGE_SIZE = 200;

/**
 * A file, a page at a time.
 *
 * This view gets the whole pane and lays itself out in three parts: a toolbar that does not move, a
 * body that scrolls with its header stuck to the top and its row numbers stuck to the left, and a
 * pager pinned to the bottom so turning the page does not mean scrolling back up first.
 *
 * Paginated rather than virtualised, because a scroll position is not a URL and the point of this is
 * that a finding can be pasted into an issue. Nobody investigates a data problem by scrolling 2.9
 * million rows either; they filter down to nine and read them.
 */
export function fileTable(page: Page, route: Extract<Route, {view: "file"}>): string {
  const columns = [...page.header];
  const linkable = new Set(["stop_id", "parent_station", "from_stop_id", "to_stop_id",
    "trip_id", "from_trip_id", "to_trip_id", "route_id", "service_id"]);

  const head = columns.map(column => {
    const descending = route.sort === column && !route.descending;
    const to = format({...route, sort: column, descending, page: 0});
    const marker = route.sort === column ? (route.descending ? " ↓" : " ↑") : "";

    return `<th scope="col">
      <a class="grid__label" href="${to}"
         title="Sort by ${escape(column)}">${escape(column)}${marker}</a>
      <input class="grid__filter" type="text" name="${escape(column)}"
             value="${escape(route.filters[column] ?? "")}"
             aria-label="Filter ${escape(column)}" placeholder="filter">
    </th>`;
  }).join("");

  const body = page.rows.map(({index, values}) => `<tr>
      <td class="grid__row"><a href="${format(route)}#row-${csvRowNumberOf(index)}"
        title="row ${csvRowNumberOf(index)} of the file">${csvRowNumberOf(index)}</a></td>
      ${columns.map(column => `<td>${link(column, values[column], linkable)}</td>`).join("")}
    </tr>`).join("");

  const pages = Math.max(1, Math.ceil(page.matched / PAGE_SIZE));

  return `<div class="table">
    <div class="table__bar">
      <span class="table__name" tabindex="-1" data-heading>${escape(page.file)}</span>
      <span class="table__count" aria-live="polite">
        ${page.matched === page.total
          ? `${number(page.total)} rows`
          : `${number(page.matched)} of ${number(page.total)} rows`}
      </span>
      ${page.notHeld.length > 0
        ? `<span class="note">${page.notHeld.map(escape).join(" and ")} read on demand,
          not shown</span>`
        : ""}
      ${page.sortRefused === undefined
        ? ""
        : `<span class="warn-inline">${escape(page.sortRefused)}</span>`}
      <span class="table__tools">
        <button class="btn2" data-export="csv">CSV</button>
        <button class="btn2" data-export="json">JSON</button>
      </span>
    </div>

    <div class="table__scroll">
      <table class="grid">
        <thead><tr><th scope="col" class="grid__row">row</th>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table>
      ${page.rows.length === 0
        ? "<p class=\"empty\" style=\"padding-left: 14px;\">Nothing matches those filters.</p>"
        : ""}
    </div>

    ${pager(route, page, pages)}
  </div>`;
}

function pager(route: Extract<Route, {view: "file"}>, page: Page, pages: number): string {
  const at = Math.floor(page.offset / PAGE_SIZE);
  const to = (index: number) => format({...route, page: index});
  const step = (label: string, index: number, enabled: boolean) => enabled
    ? `<a class="btn2" href="${to(index)}">${label}</a>`
    : `<span class="btn2 btn2--off" aria-disabled="true">${label}</span>`;

  return `<nav class="pager" aria-label="Pages of ${escape(page.file)}">
    ${step("&larr; first", 0, at > 0)}
    ${step("previous", at - 1, at > 0)}
    <span class="pager__at">page ${number(at + 1)} of ${number(pages)}</span>
    ${step("next", at + 1, at < pages - 1)}
    ${step("last &rarr;", pages - 1, at < pages - 1)}
    <label class="jump">row
      <input type="number" min="2" data-jump value="" aria-label="Go to a row number">
    </label>
  </nav>`;
}

/**
 * An identifier as a link to the thing it names.
 *
 * This is most of what makes the table an explorer rather than a spreadsheet: every id is a way into
 * the view that explains it, and following a validator's notice to a row and then to the trip it is
 * about takes two clicks.
 */
function link(column: string, value: string | undefined, linkable: Set<string>): string {
  if (value === undefined || value === "" || !linkable.has(column)) {
    return cell(value);
  }

  const view = column.includes("trip")
    ? "trip"
    : column.includes("stop") || column === "parent_station"
      ? "stop"
      : column === "route_id" ? "route" : "service";

  return `<a href="${format({view, id: value} as Route)}">${escape(value)}</a>`;
}
