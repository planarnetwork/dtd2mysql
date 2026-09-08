import type {BoardDetail} from "../../worker/Detail.js";
import {format} from "../../route.js";
import {formatDate, number, weekdayOf} from "../../format.js";
import {escape} from "../dom.js";
import {addDays} from "@gb-transit/gtfs-loader";

/**
 * What leaves a station on a day.
 *
 * The best end-to-end check of a feed there is. Every other view shows you what the data says; this
 * one shows you whether it is the timetable. If the 08:xx departures from a station you know look
 * like the trains that actually run, the feed is broadly right, and if they do not the reason is one
 * click away.
 *
 * It is a departure board because this site is already a departure board, and because that is the
 * form the answer wants to take.
 */
export function boardView(detail: BoardDetail): string {
  const heading = `
    <h2 class="h2 h2--sm" tabindex="-1" data-heading>
      Departures from ${escape(detail.stopName ?? detail.stopId)}
    </h2>
    <p class="x-lede">
      ${weekdayOf(detail.date)} ${formatDate(detail.date)}
      &middot; <a href="${format({view: "stop", id: detail.stopId})}">${escape(detail.stopId)}</a>
    </p>
    <nav class="x-tools" aria-label="Other days">
      <a class="x-btn" href="${format({view: "board", id: detail.stopId,
        date: addDays(detail.date, -1)})}">&larr; the day before</a>
      <a class="x-btn" href="${format({view: "board", id: detail.stopId,
        date: addDays(detail.date, 1)})}">the day after &rarr;</a>
    </nav>`;

  if (!detail.callsLoaded) {
    return `${heading}<p class="x-warn">The calls have not been loaded, so there is no board to
      show yet. Load them from the overview.</p>`;
  }

  if (detail.departures.length === 0) {
    return `${heading}<p class="x-empty">Nothing departs here on this day. That may be right — the
      date may be outside the feed's window — or it may be the thing you came to find out.</p>`;
  }

  const rows = detail.departures.map(departure => `<tr${departure.pickup === 1
    ? " class=\"x-row--quiet\"" : ""}>
      <td class="x-board__time">${escape(departure.time)}${departure.previousDay
        ? "<span class=\"x-board__over\" title=\"runs on the previous day's service, after midnight\">+</span>"
        : ""}</td>
      <td class="x-board__to">${escape(departure.destination ?? departure.headsign ?? "")}</td>
      <td class="x-board__plat">${escape(departure.platform ?? "")}</td>
      <td class="x-board__id">
        <a href="${format({view: "trip", id: departure.tripId})}">${escape(departure.shortName
          ?? departure.tripId)}</a>
        ${departure.pickup === 1 ? "<span class=\"x-board__note\">nobody boards</span>" : ""}
      </td>
    </tr>`).join("");

  const overnight = detail.departures.filter(departure => departure.previousDay).length;

  return `${heading}
    <div class="x-board">
      <table class="x-board__table">
        <caption class="x-board__caption">
          ${number(detail.departures.length)} departures
        </caption>
        <thead><tr>
          <th scope="col">time</th><th scope="col">destination</th>
          <th scope="col">plat</th><th scope="col">service</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    ${overnight === 0 ? "" : `<p class="x-note">
      ${number(overnight)} of these are marked <span class="x-board__over">+</span>: they are written
      in the feed at 24:00 or later and belong to the previous day's service, which is where a
      passenger catching a train at half past midnight would expect to find them.</p>`}`;
}
