/**
 * A slippy map of one point, or of a line.
 *
 * Written out rather than pulled in. Leaflet is 40 KB for pan, zoom and a tile grid, and the tile
 * grid is the only part wanted here - a station is one point and the question is what is around it.
 * The whole of the maths is that the world at zoom z is 2^z tiles across.
 *
 * This is the one thing on the site that asks anything of anyone else. The tiles come from
 * openstreetmap.org and the panel says so.
 */

const TILE = 256;
const ZOOM = 17;
const HEIGHT = 200;
/**
 * A line gets more room than a point does. A station map answers "what is around here", which a
 * squat strip does; a trip's line runs from London to Edinburgh and a squat strip is a smear.
 */
const LINE_HEIGHT = 360;
/** Room for the line to breathe inside the box rather than run into its corners. */
const PADDING = 18;
const ATTRIBUTION = "&copy; OpenStreetMap contributors";

/** A point on a line, as the feed gives it. */
export type LinePoint = readonly [lat: number, lon: number];

/**
 * Draw the area around a coordinate into a container.
 *
 * The container is measured first and the grid built to fit it, so the tiles cover it exactly and
 * nothing hangs outside. `.map` clips anyway - but it only clips because the class name here and the
 * one in the stylesheet agree, which they did not once, and the result was a column of unpositioned
 * images running down the page and over everything under it.
 */
export function showMap(container: HTMLElement, lat: number, lon: number): void {
  const width = Math.max(container.clientWidth, 160);
  const centre = project(lat, lon, ZOOM);
  const map = document.createElement("div");

  map.className = "map";
  map.style.height = `${HEIGHT}px`;
  map.setAttribute("role", "img");
  map.setAttribute("aria-label", `A map of the area around ${lat}, ${lon}, from OpenStreetMap.`);

  const left = centre.x - width / 2;
  const top = centre.y - HEIGHT / 2;

  tileGrid(map, left, top, width, HEIGHT, ZOOM);

  const marker = document.createElement("div");

  marker.className = "map__marker";
  marker.style.left = `${width / 2}px`;
  marker.style.top = `${HEIGHT / 2}px`;
  map.appendChild(marker);

  container.replaceChildren(map, credit());
}

/**
 * Draw a line into a container, with the map zoomed to hold the whole of it.
 *
 * Unlike a station, a line has an extent, so the zoom is worked out from it rather than fixed: the
 * furthest apart two points are decides how much world has to fit in the box. A King's Cross to
 * Edinburgh trip and a Merseyrail shuttle are the same picture at different scales.
 *
 * The line itself is one SVG polyline over the tiles rather than a run of positioned elements. It
 * is a single path of up to a couple of hundred points, and the browser already knows how to draw
 * one of those.
 */
export function showLine(container: HTMLElement, points: readonly LinePoint[]): void {
  if (points.length < 2) {
    return;
  }

  const width = Math.max(container.clientWidth, 160);
  const box = {width: width - PADDING * 2, height: LINE_HEIGHT - PADDING * 2};
  const corners = points.map(([lat, lon]) => unit(lat, lon));
  const min = {x: Math.min(...corners.map(p => p.x)), y: Math.min(...corners.map(p => p.y))};
  const max = {x: Math.max(...corners.map(p => p.x)), y: Math.max(...corners.map(p => p.y))};
  const zoom = zoomFor(max.x - min.x, max.y - min.y, box);
  const scale = TILE * 2 ** zoom;

  // The centre of the extent, in the pixel plane of the chosen zoom, put in the middle of the box.
  const centre = {x: (min.x + max.x) / 2 * scale, y: (min.y + max.y) / 2 * scale};
  const left = centre.x - width / 2;
  const top = centre.y - LINE_HEIGHT / 2;

  const map = document.createElement("div");

  map.className = "map";
  map.style.height = `${LINE_HEIGHT}px`;
  map.setAttribute("role", "img");
  map.setAttribute("aria-label",
    `A map of the line this trip runs over, from OpenStreetMap. It is described below.`);

  tileGrid(map, left, top, width, LINE_HEIGHT, zoom);

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

  svg.setAttribute("class", "map__line");
  svg.setAttribute("viewBox", `0 0 ${width} ${LINE_HEIGHT}`);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(LINE_HEIGHT));
  svg.setAttribute("aria-hidden", "true");

  const plotted = corners.map(p => [p.x * scale - left, p.y * scale - top] as const);
  const line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");

  line.setAttribute("points", plotted.map(([x, y]) => `${round(x)},${round(y)}`).join(" "));
  svg.appendChild(line);

  // The ends, so the direction of travel is readable off the picture. Drawn after the line so they
  // sit over it rather than under.
  for (const [index, name] of [[0, "start"], [plotted.length - 1, "end"]] as const) {
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");

    dot.setAttribute("class", `map__end map__end--${name}`);
    dot.setAttribute("cx", round(plotted[index][0]));
    dot.setAttribute("cy", round(plotted[index][1]));
    dot.setAttribute("r", "5");
    svg.appendChild(dot);
  }

  map.appendChild(svg);
  container.replaceChildren(map, credit());
}

/**
 * The largest zoom at which an extent still fits the box.
 *
 * Floored, because a zoom half a level too far in cuts the ends off. Clamped at both ends: a line
 * whose points are all in one place would otherwise ask for an infinite zoom, and one spanning the
 * planet for a negative one.
 */
export function zoomFor(spanX: number, spanY: number, box: {width: number, height: number}): number {
  const scale = Math.min(
    spanX > 0 ? box.width / spanX : Infinity,
    spanY > 0 ? box.height / spanY : Infinity
  );

  if (!Number.isFinite(scale)) {
    return ZOOM;
  }

  return Math.max(0, Math.min(ZOOM, Math.floor(Math.log2(scale / TILE))));
}

/**
 * Cover a box with tiles at one zoom, given where its top left corner sits in the pixel plane.
 */
function tileGrid(
  map: HTMLElement,
  left: number,
  top: number,
  width: number,
  height: number,
  zoom: number
): void {
  const tiles = 2 ** zoom;

  for (let x = Math.floor(left / TILE); x <= Math.floor((left + width) / TILE); x++) {
    for (let y = Math.floor(top / TILE); y <= Math.floor((top + height) / TILE); y++) {
      if (y < 0 || y >= tiles) {
        continue;
      }

      const image = document.createElement("img");

      // Wrapped rather than clamped, so a map near the date line does not ask for a tile that is not
      // there. Britain is nowhere near it; the map is not only ever used on Britain.
      image.src = `https://tile.openstreetmap.org/${zoom}/${((x % tiles) + tiles) % tiles}/${y}.png`;
      image.alt = "";
      image.width = TILE;
      image.height = TILE;
      image.className = "map__tile";
      image.style.left = `${x * TILE - left}px`;
      image.style.top = `${y * TILE - top}px`;
      map.appendChild(image);
    }
  }
}

function credit(): HTMLElement {
  const element = document.createElement("p");

  element.className = "map__credit";
  element.innerHTML = ATTRIBUTION;

  return element;
}

const round = (n: number) => (Math.round(n * 10) / 10).toString();

/** Where a coordinate lands in the pixel plane of a zoom level. Web Mercator, and nothing else. */
function project(lat: number, lon: number, zoom: number): {x: number, y: number} {
  const scale = TILE * 2 ** zoom;
  const {x, y} = unit(lat, lon);

  return {x: scale * x, y: scale * y};
}

/**
 * The same projection with the zoom left out - the point as a fraction of the world.
 *
 * A line has to be measured before its zoom can be chosen, and it cannot be measured in a pixel
 * plane that does not exist yet. Multiply by `TILE * 2 ** zoom` to land in one.
 */
export function unit(lat: number, lon: number): {x: number, y: number} {
  const sin = Math.sin(lat * Math.PI / 180);

  return {
    x: lon / 360 + 0.5,
    y: 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)
  };
}
