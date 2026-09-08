import type {LinkDetail, TripDetail} from "../../worker/Detail.js";
import type {ServiceDate} from "../../model/Calendar.js";
import {format} from "../../route.js";
import {dropOffOf, formatDate, number, pickupOf, weekdayOf} from "../../format.js";
import {cell, escape} from "../dom.js";

/**
 * One train, in full.
 *
 * Two questions bring people here. "Why does this not appear on Tuesday" is answered by the calendar
 * below, expanded to real dates with the exclusions struck through - because in this feed an overlay
 * is exclusions on the permanent trip plus a separate trip that nothing links to it, and the dates
 * are the only place that shows. "Where did the rest of the train go" is answered by the couplings,
 * which are the transfers.txt rows of type 4 naming this trip at either end.
 */
export function tripView(detail: TripDetail): string {
  if (detail.row === undefined) {
    return `
      <h2 class="h2 h2--sm" tabindex="-1" data-heading>${escape(detail.id)}</h2>
      <p class="x-empty">trips.txt has no such trip.</p>`;
  }

  const row = detail.row;

  return `
    <h2 class="h2 h2--sm" tabindex="-1" data-heading>
      ${escape(row.trip_short_name ?? detail.id)}
      ${row.trip_headsign === undefined ? "" : `<span class="x-sub">to ${escape(row.trip_headsign)}</span>`}
    </h2>
    <p class="x-lede">
      ${escape(detail.id)}
      ${detail.route === undefined ? "" : ` &middot; <a href="${format({view: "route",
        id: detail.route.route_id as string})}">${escape(detail.route.route_long_name
          ?? detail.route.route_short_name ?? detail.route.route_id)}</a>`}
      ${detail.agency === undefined ? "" : ` &middot; ${escape(detail.agency.agency_name)}`}
      ${detail.runs === undefined ? "" : ` &middot; runs on ${number(detail.runs)} days`}
    </p>

    ${couplings(detail)}
    ${calls(detail)}
    ${calendar(detail)}`;
}

function calls(detail: TripDetail): string {
  if (!detail.callsLoaded) {
    return `<p class="x-warn">The calls have not been loaded, so this trip has no calling pattern
      here yet. Load them from the overview.</p>`;
  }
  if (detail.calls.length === 0) {
    return "<p class=\"x-empty\">This trip has no calls at all, which the checks would report.</p>";
  }

  const rows = detail.calls.map(call => {
    // The distinction that actually matters in this feed: a call a train makes where nobody may
    // board is an operational stop, and it looks like a missing service until it is said in words.
    const operational = call.pickup === 1 && call.dropOff === 1;

    return `<tr${operational ? " class=\"x-row--quiet\"" : ""}>
      <td class="x-num">${call.sequence}</td>
      <td>${call.stopId === undefined
        ? ""
        : `<a href="${format({view: "stop", id: call.parentId !== undefined && call.parentId !== ""
          ? call.parentId : call.stopId})}">${escape(call.stopName ?? call.stopId)}</a>`}
        ${call.platform === undefined ? "" : `<span class="x-plat">${escape(call.platform)}</span>`}</td>
      <td class="x-num">${call.arrival ?? "<span class=\"x-absent\">—</span>"}</td>
      <td class="x-num">${call.departure ?? "<span class=\"x-absent\">—</span>"}</td>
      <td>${call.pickup === 0 && call.dropOff === 0
        ? "<span class=\"x-absent\">a normal call</span>"
        : `${escape(pickupOf(call.pickup))}, ${escape(dropOffOf(call.dropOff))}`}</td>
      <td>${call.timepoint === false ? "approximate" : ""}</td>
    </tr>`;
  }).join("");

  return `
    <h3 class="x-h3">Where it calls</h3>
    <div class="x-scroll">
      <table class="x-table">
        <thead><tr>
          <th scope="col" class="x-num">#</th><th scope="col">stop</th>
          <th scope="col" class="x-num">arrives</th><th scope="col" class="x-num">leaves</th>
          <th scope="col">boarding</th><th scope="col">timing</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

/**
 * The days this runs, with the reason it does not run on the others.
 *
 * A grid of the feed's whole window rather than a list, because the shape of a service - every
 * weekday, or Saturdays only, or every day until a fortnight in October - is something you see and
 * cannot read.
 */
function calendar(detail: TripDetail): string {
  if (detail.dates.length === 0) {
    return `<p class="x-warn">This trip's service is in no calendar, so it never runs. The
      integrity checks report this.</p>`;
  }

  const days = detail.dates.map(date => day(date)).join("");
  const removed = detail.dates.filter(date => date.exception === 2).length;
  const added = detail.dates.filter(date => date.exception === 1).length;

  return `
    <h3 class="x-h3">The days it runs</h3>
    <p class="x-note">
      ${escape(pattern(detail))}
      ${removed > 0 ? ` ${number(removed)} date${removed === 1 ? " is" : "s are"} excluded.` : ""}
      ${added > 0 ? ` ${number(added)} date${added === 1 ? " is" : "s are"} added.` : ""}
      ${removed > 0 ? " An excluded date is usually a replacement schedule running instead, "
        + "which this feed publishes as a separate trip with nothing linking the two." : ""}
    </p>
    <ol class="x-cal">${days}</ol>
    <p class="x-cal__key">
      <span class="x-cal__cell x-cal__cell--runs"></span> runs
      <span class="x-cal__cell"></span> does not
      <span class="x-cal__cell x-cal__cell--removed"></span> excluded by calendar_dates.txt
      <span class="x-cal__cell x-cal__cell--added"></span> added by it
    </p>`;
}

function day(date: ServiceDate): string {
  const kind = date.exception === 2
    ? " x-cal__cell--removed"
    : date.exception === 1 ? " x-cal__cell--added" : date.runs ? " x-cal__cell--runs" : "";
  const why = date.exception === 2
    ? "excluded by calendar_dates.txt"
    : date.exception === 1 ? "added by calendar_dates.txt" : date.runs ? "runs" : "does not run";

  return `<li class="x-cal__cell${kind}">
    <span class="x-cal__label">${weekdayOf(date.date)} ${formatDate(date.date)}: ${why}</span>
  </li>`;
}

function pattern(detail: TripDetail): string {
  const row = detail.calendar;

  if (row === undefined) {
    return "This service is described only by its exceptions.";
  }

  const names = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const on = names.filter(name => row[name] === "1");

  return `${on.length === 0
    ? "No weekday is named"
    : on.length === 7
      ? "Every day"
      : on.map(name => `${name[0].toUpperCase()}${name.slice(1)}`).join(", ")}`
    + `, from ${formatDate(row.start_date ?? "")} to ${formatDate(row.end_date ?? "")}.`;
}

/**
 * What this train is coupled to.
 *
 * A split or a join is two trips and a transfers.txt row between them, so a passenger staying in
 * their seat is one journey in life and two trips in the data. Following it in both directions is
 * the point.
 */
function couplings(detail: TripDetail): string {
  if (detail.prior.length === 0 && detail.onward.length === 0) {
    return "";
  }

  const item = (link: LinkDetail, direction: string) => `<li>
    ${direction} <a href="${format({view: "trip", id: link.tripId})}">${escape(link.tripId)}</a>
    ${link.headsign === undefined ? "" : `to ${escape(link.headsign)}`}
    ${link.stopName === undefined ? "" : `at ${escape(link.stopName)}`}
    <a class="x-note" href="${format({view: "file", file: "transfers.txt", page: 0,
      filters: {from_trip_id: link.tripId}})}">the row&nearr;</a>
  </li>`;

  return `
    <h3 class="x-h3">What it couples to</h3>
    <ul class="x-links">
      ${detail.prior.map(link => item(link, "carries on from")).join("")}
      ${detail.onward.map(link => item(link, "carries on as")).join("")}
    </ul>`;
}
