/**
 * A slippy map, once somebody has asked for one.
 *
 * Written out rather than pulled in. Leaflet is 40 KB for pan, zoom and a tile grid, and the tile
 * grid is the only part wanted here - a station is one point and the question is what is around it.
 * The whole of the maths is that the world at zoom z is 2^z tiles across.
 *
 * Nothing in this file runs until the button is pressed, and the button says what pressing it does.
 */

const TILE = 256;
const ZOOM = 17;
const ATTRIBUTION = "&copy; OpenStreetMap contributors";

export function showMap(container: HTMLElement, lat: number, lon: number): void {
  const width = container.clientWidth || 320;
  const height = 260;
  const centre = project(lat, lon, ZOOM);

  const map = document.createElement("div");

  map.className = "x-map";
  map.style.height = `${height}px`;
  map.setAttribute("role", "img");
  map.setAttribute("aria-label",
    `A map of the area around ${lat}, ${lon}, from OpenStreetMap.`);

  const left = centre.x - width / 2;
  const top = centre.y - height / 2;

  for (let x = Math.floor(left / TILE); x <= Math.floor((left + width) / TILE); x++) {
    for (let y = Math.floor(top / TILE); y <= Math.floor((top + height) / TILE); y++) {
      const tiles = 2 ** ZOOM;

      if (y < 0 || y >= tiles) {
        continue;
      }

      const image = document.createElement("img");

      // Wrapped rather than clamped, so a map near the date line does not ask for a tile that is
      // not there. Britain is nowhere near it; the map is not only ever used on Britain.
      image.src = `https://tile.openstreetmap.org/${ZOOM}/${((x % tiles) + tiles) % tiles}/${y}.png`;
      image.alt = "";
      image.loading = "lazy";
      image.width = TILE;
      image.height = TILE;
      image.className = "x-map__tile";
      image.style.left = `${x * TILE - left}px`;
      image.style.top = `${y * TILE - top}px`;
      map.appendChild(image);
    }
  }

  const marker = document.createElement("div");

  marker.className = "x-map__marker";
  marker.style.left = `${width / 2}px`;
  marker.style.top = `${height / 2}px`;
  map.appendChild(marker);

  const credit = document.createElement("p");

  credit.className = "x-map__credit";
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
