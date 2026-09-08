import type {StopDetail} from "../worker/Detail.js";
import type {FieldHistory} from "../provenance.js";
import {metresBetween, number} from "../format.js";
import {escape} from "./dom.js";

/**
 * Where a station and its boarding points are, relative to each other.
 *
 * Deliberately not a map of Great Britain. The question this answers is "have these drifted apart",
 * and for that a scale bar and the actual metres are worth more than a coastline: a platform 400
 * metres from its station is obvious here and invisible at national scale. Whether the whole thing
 * is in the right country is what the geography checks are for, and whether it is on the right side
 * of the road is what the map button is for.
 *
 * It makes no network request. Nothing is drawn from anywhere but the feed.
 */

export interface Point {
  lat: number;
  lon: number;
  label: string;
  kind: "station" | "child" | "overruled";
}

export function plot(detail: StopDetail): string {
  const points = pointsOf(detail);

  if (points.length === 0) {
    return `<div class="x-plot x-plot--none">
      <p class="x-empty">This stop has no coordinate, so there is nothing to draw.</p>
    </div>`;
  }

  const size = 260;
  const pad = 26;
  const bounds = boundsOf(points);
  const place = (point: Point) => ({
    x: pad + (bounds.width === 0 ? 0.5 : (point.lon - bounds.west) / bounds.width) * (size - pad * 2),
    // Latitude increases northwards and y increases downwards, so this is the one flip.
    y: pad + (bounds.height === 0 ? 0.5 : 1 - (point.lat - bounds.south) / bounds.height) * (size - pad * 2)
  });

  const marks = points.map(point => {
    const {x, y} = place(point);

    if (point.kind === "overruled") {
      // A hollow ring, joined to where the value that won put it, with the distance on the line.
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6" class="x-plot__overruled">
        <title>${escape(point.label)}</title></circle>`;
    }

    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${point.kind === "station" ? 7 : 4}"
      class="x-plot__${point.kind}"><title>${escape(point.label)}</title></circle>`;
  }).join("");

  const station = points.find(point => point.kind === "station");
  const lines = station === undefined ? "" : points
    .filter(point => point.kind === "overruled")
    .map(point => {
      const from = place(station);
      const to = place(point);

      return `<line x1="${from.x.toFixed(1)}" y1="${from.y.toFixed(1)}"
        x2="${to.x.toFixed(1)}" y2="${to.y.toFixed(1)}" class="x-plot__link"></line>`;
    }).join("");

  return `<div class="x-plot">
    <svg viewBox="0 0 ${size} ${size}" role="img"
      aria-labelledby="plot-title plot-desc" class="x-plot__svg">
      <title id="plot-title">${escape(detail.row?.stop_name ?? detail.id)} and its boarding points</title>
      <desc id="plot-desc">${escape(described(detail, points))}</desc>
      ${scaleBar(bounds, size, pad)}
      ${lines}
      ${marks}
    </svg>
    <p class="x-plot__key">
      <span class="x-key x-key--station"></span> the station
      ${detail.children.length > 0 ? "<span class=\"x-key x-key--child\"></span> boarding points" : ""}
      ${points.some(point => point.kind === "overruled")
        ? "<span class=\"x-key x-key--overruled\"></span> a value that was overruled"
        : ""}
    </p>
    <p class="x-plot__alt">${escape(described(detail, points))}</p>
    ${mapButton(detail)}
  </div>`;
}

/**
 * The map, behind a button that says what it will do.
 *
 * Nothing else on this site makes a third-party request - the fonts are fetched at build time for
 * exactly that reason - so the tiles are a decision the reader makes, in the words of the thing they
 * are deciding, and never on load.
 */
function mapButton(detail: StopDetail): string {
  const lat = Number(detail.row?.stop_lat);
  const lon = Number(detail.row?.stop_lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return "";
  }

  return `<p class="x-plot__map">
    <button class="x-btn" data-map="${lat},${lon}">
      Show a map &mdash; loads tiles from openstreetmap.org
    </button>
    <a class="x-note" href="https://www.openstreetmap.org/?mlat=${lat}&amp;mlon=${lon}#map=17/${lat}/${lon}"
      rel="noreferrer">or open it there &nearr;</a>
  </p>`;
}

/**
 * The picture, in words.
 *
 * The distance is the finding. Locking it inside a drawing would put it out of reach of anybody
 * reading with a screen reader, which is why it is written out here as well as plotted.
 */
function described(detail: StopDetail, points: readonly Point[]): string {
  const parts: string[] = [];
  const lat = detail.row?.stop_lat;
  const lon = detail.row?.stop_lon;

  if (lat !== undefined && lon !== undefined) {
    parts.push(`The station is at ${lat}, ${lon}.`);
  }

  const far = detail.children.filter(child => (child.metresFromParent ?? 0) > 100);

  if (detail.children.length > 0) {
    parts.push(far.length === 0
      ? `Its ${detail.children.length} boarding points are all within 100 metres of it.`
      : `${far.length} of its ${detail.children.length} boarding points are more than 100 metres `
        + `away, the furthest ${number(Math.max(...far.map(child => child.metresFromParent ?? 0)))} metres.`);
  }

  const overruled = points.filter(point => point.kind === "overruled");

  if (overruled.length > 0) {
    parts.push(`${overruled.length} overruled position${overruled.length === 1 ? "" : "s"} `
      + `also shown: ${overruled.map(point => point.label).join("; ")}.`);
  }

  return parts.join(" ");
}

function pointsOf(detail: StopDetail): Point[] {
  const points: Point[] = [];
  const lat = Number(detail.row?.stop_lat);
  const lon = Number(detail.row?.stop_lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || detail.row?.stop_lat === undefined) {
    return points;
  }

  points.push({lat, lon, kind: "station", label: `${detail.row.stop_name ?? detail.id}, the value in the feed`});

  for (const child of detail.children) {
    const childLat = Number(child.row.stop_lat);
    const childLon = Number(child.row.stop_lon);

    if (Number.isFinite(childLat) && Number.isFinite(childLon) && child.row.stop_lat !== undefined) {
      points.push({
        lat: childLat,
        lon: childLon,
        kind: "child",
        label: `${child.row.stop_id}${child.row.platform_code === undefined
          ? "" : `, platform ${child.row.platform_code}`}`
          + `${child.metresFromParent === undefined ? "" : `, ${child.metresFromParent} m away`}`
      });
    }
  }

  points.push(...overruledPoints(detail.provenance, lat, lon));

  return points;
}

/**
 * Positions a source proposed and lost with.
 *
 * A coordinate is two fields, so a losing write has to be reassembled from the stop_lat and stop_lon
 * entries of the same enricher before it is a place at all.
 */
function overruledPoints(
  provenance: readonly FieldHistory[], lat: number, lon: number
): Point[] {
  const lats = new Map<string, number>();
  const lons = new Map<string, number>();

  for (const field of provenance) {
    for (const write of field.overruled) {
      const value = Number(write.value);

      if (!Number.isFinite(value)) {
        continue;
      }
      if (field.field === "stop_lat") {
        lats.set(write.enricher, value);
      }
      if (field.field === "stop_lon") {
        lons.set(write.enricher, value);
      }
    }
  }

  const points: Point[] = [];

  for (const [enricher, overruledLat] of lats) {
    const overruledLon = lons.get(enricher);

    if (overruledLon === undefined) {
      continue;
    }

    points.push({
      lat: overruledLat,
      lon: overruledLon,
      kind: "overruled",
      label: `${enricher} put it ${number(metresBetween(lat, lon, overruledLat, overruledLon))} `
        + "metres away and was overruled"
    });
  }

  return points;
}

function boundsOf(points: readonly Point[]) {
  const lats = points.map(point => point.lat);
  const lons = points.map(point => point.lon);
  const south = Math.min(...lats);
  const north = Math.max(...lats);
  const west = Math.min(...lons);
  const east = Math.max(...lons);

  // A little air around a single point, so one stop on its own is a dot in a box rather than a dot
  // filling the box at infinite zoom.
  const padLat = Math.max((north - south) * 0.2, 0.0005);
  const padLon = Math.max((east - west) * 0.2, 0.0008);

  return {
    south: south - padLat,
    west: west - padLon,
    height: (north - south) + padLat * 2,
    width: (east - west) + padLon * 2
  };
}

/** How far across the drawing is, which is the only thing that makes the dots mean anything. */
function scaleBar(
  bounds: {south: number, west: number, width: number, height: number},
  size: number,
  pad: number
): string {
  const across = metresBetween(
    bounds.south + bounds.height / 2, bounds.west,
    bounds.south + bounds.height / 2, bounds.west + bounds.width
  );

  if (across === 0) {
    return "";
  }

  // A round number of metres that fits in about a third of the width.
  const target = across / 3;
  const magnitude = Math.pow(10, Math.floor(Math.log10(target)));
  const metres = Math.max(magnitude, Math.round(target / magnitude) * magnitude);
  const width = (metres / across) * (size - pad * 2);

  return `<g class="x-plot__scale">
    <line x1="${pad}" y1="${size - 10}" x2="${(pad + width).toFixed(1)}" y2="${size - 10}"></line>
    <text x="${pad}" y="${size - 15}">${number(metres)} m</text>
  </g>`;
}
