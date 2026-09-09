import type {RouteDetail, ServiceDetail} from "../../worker/Detail.js";
import type {ServiceDate} from "../../model/Calendar.js";
import {format} from "../../route.js";
import {formatDate, number, routeTypeOf, weekdayOf} from "../../format.js";
import {cell, escape} from "../dom.js";

/**
 * The two views that are mostly a list.
 *
 * A route and a service are both "what is on this", and neither needs the machinery the stop and
 * trip views do. They exist because half the calendar question is answered by looking at a service
 * from the other end: not "when does this trip run" but "what else runs on the days this does".
 */

export function routeView(detail: RouteDetail): string {
  if (detail.row === undefined) {
    return `<h2 class="h h1" tabindex="-1" data-heading>${escape(detail.id)}</h2>
      <p class="empty">routes.txt has no such route.</p>`;
  }

  const row = detail.row;

  return `
    <h2 class="h h1" tabindex="-1" data-heading>
      ${escape(row.route_long_name ?? row.route_short_name ?? detail.id)}
    </h2>
    <p class="lede">
      ${escape(detail.id)} &middot; ${routeTypeOf(row.route_type)}
      ${detail.agency === undefined ? "" : ` &middot; ${escape(detail.agency.agency_name)}`}
      &middot; ${number(detail.totalTrips)} trips
    </p>
    <dl class="fields">
      ${Object.entries(row).map(([column, value]) =>
        `<div class="field"><dt>${escape(column)}</dt><dd>${cell(value)}</dd></div>`).join("")}
    </dl>
    <h3 class="h h2">Trips on this route</h3>
    ${list(detail.trips.map(trip => `
      <li><a href="${format({view: "trip", id: trip.id})}">${escape(trip.shortName ?? trip.id)}</a>
        ${trip.headsign === undefined ? "" : `to ${escape(trip.headsign)}`}
        ${trip.serviceId === undefined ? "" : `<a class="note" href="${format({view: "service",
          id: trip.serviceId})}">service ${escape(trip.serviceId)}</a>`}</li>`),
      detail.totalTrips, detail.trips.length, "route_id", detail.id)}`;
}

export function serviceView(detail: ServiceDetail): string {
  const row = detail.row;

  return `
    <h2 class="h h1" tabindex="-1" data-heading>Service ${escape(detail.id)}</h2>
    <p class="lede">
      ${row === undefined
        ? "Described only by its exceptions — calendar.txt has no row for it."
        : `${escape(pattern(row))}`}
      &middot; ${number(detail.totalTrips)} trips
      ${detail.dates.length === 0 ? "" : ` &middot; runs on ${number(
        detail.dates.filter(date => date.runs).length)} days of the feed's window`}
    </p>
    ${row === undefined ? "" : `<dl class="fields">
      ${Object.entries(row).map(([column, value]) =>
        `<div class="field"><dt>${escape(column)}</dt><dd>${cell(value)}</dd></div>`).join("")}
    </dl>`}
    ${detail.dates.length === 0 ? "" : `
      <h3 class="h h2">The days it runs</h3>
      <ol class="cal">${detail.dates.map(day).join("")}</ol>`}
    ${detail.exceptions.length === 0 ? "" : `
      <h3 class="h h2">Its exceptions</h3>
      <p class="note">${number(detail.exceptions.length)} rows of calendar_dates.txt name this
        service. In this feed an exclusion usually means a replacement schedule runs instead,
        published as a separate trip that nothing links to this one.</p>
      <div class="scroll"><table class="list">
        <thead><tr><th scope="col">date</th><th scope="col">what it does</th></tr></thead>
        <tbody>${detail.exceptions.map(exception => `<tr>
          <td>${formatDate(exception.date ?? "")}</td>
          <td>${exception.exception_type === "1" ? "adds the date" : "removes the date"}</td>
        </tr>`).join("")}</tbody>
      </table></div>`}
    <h3 class="h h2">Trips on this service</h3>
    ${list(detail.trips.map(trip => `
      <li><a href="${format({view: "trip", id: trip.id})}">${escape(trip.id)}</a>
        ${trip.headsign === undefined ? "" : `to ${escape(trip.headsign)}`}</li>`),
      detail.totalTrips, detail.trips.length, "service_id", detail.id)}`;
}

/**
 * A list, and a way to see the rest of it.
 *
 * A route with nine thousand trips is not a list anybody reads, so it is cut off and the file table
 * - which pages, filters and exports - is offered for the whole of it. Saying how many were left
 * out matters: a silently truncated list reads as a complete one.
 */
function list(
  items: readonly string[], total: number, shown: number, column: string, id: string
): string {
  if (items.length === 0) {
    return "<p class=\"empty\">Nothing.</p>";
  }

  return `<ul class="links">${items.join("")}</ul>
    ${total > shown ? `<p class="note">Showing ${number(shown)} of ${number(total)}.
      <a href="${format({view: "file", file: "trips.txt", page: 0, filters: {[column]: id}})}">
        See all of them in trips.txt &rarr;</a></p>` : ""}`;
}

function day(date: ServiceDate): string {
  const kind = date.exception === 2
    ? " cal__cell--removed"
    : date.exception === 1 ? " cal__cell--added" : date.runs ? " cal__cell--runs" : "";

  return `<li class="cal__cell${kind}"><span class="cal__label">
    ${weekdayOf(date.date)} ${formatDate(date.date)}</span></li>`;
}

function pattern(row: Record<string, string | undefined>): string {
  const names = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const on = names.filter(name => row[name] === "1");

  return `${on.length === 0 ? "No weekday named" : on.length === 7 ? "Every day"
    : on.map(name => `${name[0].toUpperCase()}${name.slice(1, 3)}`).join(" ")}`
    + `, ${formatDate(row.start_date ?? "")} to ${formatDate(row.end_date ?? "")}`;
}
