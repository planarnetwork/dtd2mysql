import type {ShapeViewDetail} from "../../worker/Detail.js";
import {format} from "../../route.js";
import {number} from "../../format.js";
import {escape} from "../dom.js";

/**
 * One line, and what runs over it.
 *
 * A shape gets a view of its own because it is shared. A trip has one line, but a line has many
 * trips - the fast and the stopper over the same ground carry the same id - and "what else runs
 * here" is a question only this end can answer.
 */
export function shapeView(detail: ShapeViewDetail): string {
  if (detail.points.length === 0) {
    return `
      <h2 class="h h1" tabindex="-1" data-heading>${escape(detail.id)}</h2>
      <p class="empty">shapes.txt has no such shape.${detail.totalTrips === 0 ? "" :
        ` ${number(detail.totalTrips)} trip${detail.totalTrips === 1 ? "" : "s"} name it, so their
        shape_id is dangling — the integrity checks report this.`}</p>`;
  }

  return `
    <h2 class="h h1" tabindex="-1" data-heading>${escape(detail.id)}</h2>
    <p class="lede">
      A line through ${number(detail.points.length)} station${detail.points.length === 1 ? "" : "s"}
      &middot; ${detail.length < 10 ? detail.length.toFixed(1) : number(Math.round(detail.length))} km
      &middot; ${number(detail.totalTrips)} trip${detail.totalTrips === 1 ? "" : "s"}
    </p>

    ${detail.points.length < 2
      ? `<p class="warn">One point is not a line, so there is nothing to draw. The integrity checks
         report this.</p>`
      : `<div class="plot__map" data-line="${escape(JSON.stringify([detail.points]))}"></div>
         <p class="note plot__there">
           The line runs through every station a train touches, calling or passing. Between two of
           them it is straight, because the feed has no coordinate for the junctions in between.
         </p>`}

    <p class="note">
      <a href="${format({view: "file", file: "shapes.txt", page: 0,
        filters: {shape_id: detail.id}})}">The rows&nearr;</a>
    </p>

    ${trips(detail)}`;
}

/**
 * The trips over this line.
 *
 * The list is the point of the view: a line with three hundred trips on it is a line the timetable
 * leans on, and that is not visible from any one of them.
 */
function trips(detail: ShapeViewDetail): string {
  if (detail.totalTrips === 0) {
    return `<h3 class="h h2">What runs over it</h3>
      <p class="empty">No trip names this shape, so nothing is drawn along it. The integrity checks
      report a line nothing runs over.</p>`;
  }

  const items = detail.trips.map(trip => `<li>
    <a href="${format({view: "trip", id: trip.id})}">${escape(trip.id)}</a>
    ${trip.headsign === undefined ? "" : `to ${escape(trip.headsign)}`}
    ${trip.routeId === undefined ? "" : `<a class="note" href="${format({view: "route",
      id: trip.routeId})}">${escape(trip.routeId)}</a>`}
  </li>`).join("");

  return `
    <h3 class="h h2">What runs over it</h3>
    ${detail.totalTrips > detail.trips.length
      ? `<p class="note">${number(detail.trips.length)} of ${number(detail.totalTrips)} shown.
         <a href="${format({view: "file", file: "trips.txt", page: 0,
           filters: {shape_id: detail.id}})}">All of them&nearr;</a></p>`
      : ""}
    <ul class="links">${items}</ul>`;
}
