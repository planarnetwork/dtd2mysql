/**
 * A slippy map of one point.
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
const ATTRIBUTION = "&copy; OpenStreetMap contributors";

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
  const tiles = 2 ** ZOOM;

  for (let x = Math.floor(left / TILE); x <= Math.floor((left + width) / TILE); x++) {
    for (let y = Math.floor(top / TILE); y <= Math.floor((top + HEIGHT) / TILE); y++) {
      if (y < 0 || y >= tiles) {
        continue;
      }

      const image = document.createElement("img");

      // Wrapped rather than clamped, so a map near the date line does not ask for a tile that is not
      // there. Britain is nowhere near it; the map is not only ever used on Britain.
      image.src = `https://tile.openstreetmap.org/${ZOOM}/${((x % tiles) + tiles) % tiles}/${y}.png`;
      image.alt = "";
      image.width = TILE;
      image.height = TILE;
      image.className = "map__tile";
      image.style.left = `${x * TILE - left}px`;
      image.style.top = `${y * TILE - top}px`;
      map.appendChild(image);
    }
  }

  const marker = document.createElement("div");

  marker.className = "map__marker";
  marker.style.left = `${width / 2}px`;
  marker.style.top = `${HEIGHT / 2}px`;
  map.appendChild(marker);

  const credit = document.createElement("p");

  credit.className = "map__credit";
  credit.innerHTML = ATTRIBUTION;

  container.replaceChildren(map, credit);
}

/** Where a coordinate lands in the pixel plane of a zoom level. Web Mercator, and nothing else. */
function project(lat: number, lon: number, zoom: number): {x: number, y: number} {
  const scale = TILE * 2 ** zoom;
  const sin = Math.sin(lat * Math.PI / 180);

  return {
    x: scale * (lon / 360 + 0.5),
    y: scale * (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI))
  };
}
