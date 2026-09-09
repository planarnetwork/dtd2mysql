import * as fs from "node:fs";
import * as http from "node:http";
import * as path from "node:path";
import {chromium} from "playwright";

/**
 * The explorer, in a browser.
 *
 * Everything under src/explorer except ui/ is unit tested, and none of that caught either of the two
 * faults that reached the published site: a button that was live before there was a feed to press it
 * against, because a display rule beat the hidden attribute, and a progress bar that was never
 * cleared, so loading the calls looked like it never finished. Both are only visible to something
 * that opens the page and clicks.
 *
 * Not part of `yarn vitest run`, deliberately - it needs a built site and a browser, neither of which
 * CI has. It is `.browser.mts` rather than `.spec.mts` so the runner does not pick it up.
 *
 *   yarn workspace @gb-transit/website run build
 *   cp data/gtfs.zip apps/website/public/          # CI does this from the release
 *   node apps/website/test/explorer.browser.mts
 */

const ROOT = path.join(import.meta.dirname, "..", "dist");
const BASE = "/gb-transit";
const PORT = 8899;

const TYPES: Record<string, string> = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".zip": "application/zip", ".woff2": "font/woff2"
};

let failures = 0;
const missing: string[] = [];

function check(what: string, ok: boolean, detail = ""): void {
  console.log(`${ok ? "  ok  " : "FAIL  "}${what}${detail === "" ? "" : ` — ${detail}`}`);

  if (!ok) {
    failures++;
  }
}

/** The site, served under its base path, because every link the build wrote carries one. */
const server = http.createServer((request, response) => {
  const asked = decodeURIComponent((request.url ?? "/").split("?")[0]);
  const relative = asked.startsWith(BASE) ? asked.slice(BASE.length) : asked;
  const file = path.join(ROOT, relative.endsWith("/") ? `${relative}index.html` : relative);

  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    // The browser asks for this on its own and the site has never had one. Not the page's doing.
    if (asked !== "/favicon.ico") {
      missing.push(asked);
    }
    response.writeHead(404).end("not found");

    return;
  }

  response.writeHead(200, {"content-type": TYPES[path.extname(file)] ?? "application/octet-stream"});
  fs.createReadStream(file).pipe(response);
});

await new Promise<void>(resolve => server.listen(PORT, resolve));

// The Chrome already on the machine, rather than the one playwright would download: this is a check
// somebody runs by hand before publishing, not a matrix, and 150MB of second browser to run it once
// is not a trade worth making. `npx playwright install chromium` if there is no Chrome here.
const browser = await chromium.launch({channel: "chrome"});
const page = await browser.newPage({viewport: {width: 1440, height: 900}});
const errors: string[] = [];
const offsite: string[] = [];
const tiles: string[] = [];

page.on("pageerror", error => errors.push(error.message));
page.on("console", message => {
  // The browser's own favicon request 404s on every page of this site, and is not this page's.
  // Chrome's message for this does not name the file, so it is the location that has to be read.
  if (message.type() === "error" && !message.location().url.includes("favicon")) {
    errors.push(message.text());
  }
});
page.on("requestfailed", request => {
  if (!request.url().includes("favicon")) {
    errors.push(`could not load ${request.url()}`);
  }
});
page.on("request", request => {
  const url = request.url();

  if (url.startsWith(`http://localhost:${PORT}`)) {
    return;
  }

  // The map tiles on a station are the one thing here that comes from anywhere else. Everything
  // else asking to leave this origin is a fault, so it is named rather than tolerated.
  (url.startsWith("https://tile.openstreetmap.org/") ? tiles : offsite).push(url);
});

const at = `http://localhost:${PORT}${BASE}/feeds/explorer/`;

await page.goto(at, {waitUntil: "networkidle"});

// Before a feed is open, none of the app is reachable.
check("the app is hidden until a feed is open", !await page.locator("#explorer-app").isVisible());
check("the landing offers the feed", await page.locator("[data-open-latest]").isVisible());

await page.click("[data-open-latest]");

// A loading screen while it reads, because 202 MB of text is a real wait and a page that looks
// frozen for three seconds is indistinguishable from one that has died.
await page.waitForSelector("#explorer-loading:not([hidden])", {timeout: 10000});
check("it says what it is doing while it opens",
  (await page.locator("#explorer-loading-what").textContent())?.trim() !== "");

await page.waitForSelector("#explorer-rail a", {timeout: 300000});

check("the feed opens", (await page.locator("#explorer-name").textContent())?.includes("gtfs.zip") === true);
check("the rail lists the files", await page.locator("#explorer-rail a").count() > 5);
check("the loading screen goes away", !await page.locator("#explorer-loading").isVisible());

// The whole point of this file: the stop times are there, without anybody having asked for them.
const loaded = await page.locator("#explorer-calls").textContent();

check("the stop times are loaded, unasked", (loaded ?? "").includes("calls"), loaded?.trim());
check("the rail counts them like any other file",
  !(await page.locator("#explorer-rail").textContent() ?? "").includes("—"));

// The views, now that there is something behind all of them.
await page.goto(`${at}#/file/stop_times.txt`);
await page.waitForSelector(".grid tbody tr", {timeout: 60000});

const rows = await page.locator(".grid tbody tr").count();
const columns = await page.locator(".grid thead th").count();

check("stop_times has rows", rows > 0, `${rows} rows, ${columns} columns`);
check("the table fills the pane", await page.locator(".table__scroll").isVisible());

const pane = await page.locator(".table__scroll").boundingBox();
const viewport = page.viewportSize();

check("the table uses the viewport height", (pane?.height ?? 0) > (viewport?.height ?? 0) * 0.6,
  `${Math.round(pane?.height ?? 0)}px of ${viewport?.height}px`);
check("the window itself does not scroll",
  await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 2));

await page.fill(".grid__filter[name=trip_id]", "C000");
await page.waitForFunction(
  () => (document.querySelector(".table__count")?.textContent ?? "").includes(" of "),
  null,
  {timeout: 30000}
);
check("filtering works", (await page.locator(".table__count").textContent())?.includes("of") === true,
  (await page.locator(".table__count").textContent())?.trim());

// Typing into a filter replaces the table under the cursor. Focus has to survive that, or the next
// character goes nowhere and the reader has to click back into the box for every letter.
await page.goto(`${at}#/file/trips.txt`);
await page.waitForSelector(".grid tbody tr", {timeout: 60000});
await page.click(".grid__filter[name=trip_headsign]");
await page.keyboard.type("Lon", {delay: 90});
await page.waitForFunction(
  () => (document.querySelector(".table__count")?.textContent ?? "").includes(" of "),
  null,
  {timeout: 30000}
);
await page.waitForTimeout(400);

const held = await page.evaluate(() => {
  const active = document.activeElement as HTMLInputElement | null;

  return {name: active?.getAttribute("name") ?? "", value: active?.value ?? "",
    at: active?.selectionStart ?? -1};
});

check("the filter keeps focus while the results update", held.name === "trip_headsign",
  `focus was on ${held.name || "nothing"}`);
check("it keeps what was typed, and the caret after it",
  held.value === "Lon" && held.at === 3, `value ${JSON.stringify(held.value)} caret ${held.at}`);

// And every keystroke after the re-render lands in the same box.
await page.keyboard.type("don", {delay: 90});
await page.waitForTimeout(500);
check("typing carries on after the table has been replaced",
  await page.evaluate(() => (document.activeElement as HTMLInputElement | null)?.value) === "London",
  await page.evaluate(() => (document.activeElement as HTMLInputElement | null)?.value ?? ""));

await page.goto(`${at}#/stop/910GCLPHMJC`);
await page.waitForSelector("[data-heading]", {timeout: 60000});
// Nothing may tell the reader to go and load something. There is nothing to load.
check("no view asks for the stop times to be loaded",
  !(await page.locator("#explorer-view").textContent() ?? "").includes("have not been loaded"));

check("a station opens", (await page.locator("[data-heading]").textContent())?.includes("Clapham") === true);
check("its boarding points are listed", await page.locator(".list tbody tr").count() > 0);
check("its provenance is shown", await page.locator("text=Where this came from").count() > 0);
check("the plot is drawn", await page.locator(".plot__svg").count() === 1);

// The map draws itself, and stays inside its box. It was laying out as a column of unpositioned
// images running down the page, because the class names here and in the stylesheet had drifted.
await page.waitForSelector(".map__tile", {timeout: 30000});

const box = await page.locator(".map").boundingBox();
const laidOut = await page.evaluate(() => {
  const map = document.querySelector(".map");
  const tile = document.querySelector(".map__tile");

  return {
    clipped: map === null ? "" : getComputedStyle(map).overflow,
    positioned: tile === null ? "" : getComputedStyle(tile).position
  };
});

check("the map draws itself", (box?.height ?? 0) > 100 && (box?.width ?? 0) > 100,
  `${Math.round(box?.width ?? 0)}x${Math.round(box?.height ?? 0)}`);

// The tiles overhang the box on every side and are clipped by it. What went wrong was that they were
// not positioned at all, so they stacked and ran down the page over everything below.
check("its tiles are positioned rather than stacked", laidOut.positioned === "absolute",
  `position: ${laidOut.positioned || "no tile"}`);
check("the box clips them", laidOut.clipped === "hidden", `overflow: ${laidOut.clipped}`);
check("it fits inside the plot panel",
  (box?.width ?? 0) <= ((await page.locator(".plot").boundingBox())?.width ?? 0) + 1);
check("the tiles come from OpenStreetMap", tiles.length > 0, `${tiles.length} tiles`);

// A trip draws the line it runs over, which is the same tile grid zoomed to an extent rather than
// to a point. The failure this catches is a zoom one level too far in: the line still draws, and
// what is left of it inside the box looks like a shorter line rather than like a bug.
// The id is read out of the table by column name rather than by position. Taking it positionally
// picked the row number column's neighbour and navigated to a trip that does not exist - and the
// checks below still passed, because the "no such trip" view has a heading too.
await page.goto(`${at}#/file/trips.txt`);
await page.waitForSelector(".table__scroll td", {timeout: 60000});

const tripId = await page.evaluate(() => {
  const headers = [...document.querySelectorAll(".table__scroll thead th")]
    .map(cell => cell.textContent?.trim());
  const column = headers.indexOf("trip_id");
  const first = document.querySelector(".table__scroll tbody tr");

  return column < 0 || first === null
    ? null
    : first.querySelectorAll("td")[column]?.textContent?.trim() ?? null;
});

check("a trip id can be read out of the table", tripId !== null && tripId !== "", tripId ?? "none");

await page.goto(`${at}#/trip/${tripId}`);
await page.waitForSelector("[data-heading]", {timeout: 60000});
// Not the count of headings: the "no such trip" view renders one of those too, which is how the
// wrong id passed this check for a whole run.
check("a trip opens",
  !(await page.locator("#explorer-view").textContent() ?? "").includes("has no such trip"),
  tripId ?? "");
check("the trip says where it calls",
  await page.getByRole("heading", {name: "Where it calls"}).count() === 1);
check("the trip draws the line it runs over",
  await page.getByRole("heading", {name: "The line it runs over"}).count() === 1);

await page.waitForSelector(".map__line polyline", {timeout: 30000});

const drawn = await page.evaluate(() => {
  const svg = document.querySelector(".map__line");
  const line = document.querySelector<SVGPolylineElement>(".map__line polyline");
  const map = svg?.closest(".map");

  if (svg === null || line === null || map === null || map === undefined) {
    return null;
  }

  const points = [...line.getAttribute("points")!.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)]
    .map(([, x, y]) => [Number(x), Number(y)]);
  const box = map.getBoundingClientRect();

  return {
    count: points.length,
    inside: points.filter(([x, y]) => x >= 0 && y >= 0 && x <= box.width && y <= box.height).length,
    ends: document.querySelectorAll(".map__end").length,
    stroke: getComputedStyle(line).stroke
  };
});

check("the line has the points the shape has", (drawn?.count ?? 0) > 1, `${drawn?.count} points`);
// The whole of it, not the middle of it. This is the zoom being right.
check("every point of it is inside the box", drawn !== null && drawn.inside === drawn.count,
  `${drawn?.inside} of ${drawn?.count} inside`);
check("its ends are marked", drawn?.ends === 2, `${drawn?.ends} ends`);
check("it is drawn in something other than black",
  drawn !== null && drawn.stroke !== "" && drawn.stroke !== "rgb(0, 0, 0)", drawn?.stroke);

await page.goto(`${at}#/checks`);
await page.waitForFunction(
  () => !(document.querySelector(".lede")?.textContent ?? "").includes("Running"),
  null,
  {timeout: 300000}
);
const said = (await page.locator(".lede").first().textContent())?.trim().replace(/\s+/g, " ") ?? "";

check("the checks run", await page.locator(".check").count() > 15, said);

// They have to find things, not merely finish. The published feed has two stops published at 0,0 and
// two outside Great Britain, and a run that reports nothing at all has lost its findings on the way
// back from the worker - which is exactly what happened once.
check("the checks report what they found", await page.locator(".finding").count() > 0,
  `${await page.locator(".finding").count()} findings`);
check("it finds the two stops published at 0,0",
  await page.locator(".finding", {hasText: "0,0"}).count() >= 2);

await page.goto(`${at}#/validation`);
await page.waitForSelector(".check", {timeout: 60000});
check("validation reads the report", await page.locator(".check").count() > 10);
check("accepted errors carry their reason", await page.locator(".accepted").count() > 0);

check("nothing but the tiles was requested from anywhere else", offsite.length === 0,
  offsite.slice(0, 3).join(" "));
check("everything the page asked for was there", missing.length === 0, missing.join(" "));
check("no script errors", errors.length === 0, errors.join("\n        "));

if (process.env.SHOTS !== undefined) {
  for (const [name, hash] of [["files", "#/file/stop_times.txt"], ["stop", "#/stop/910GCLPHMJC"],
    ["checks", "#/checks"], ["overview", "#/"]] as const) {
    await page.goto(`${at}${hash}`);
    await page.waitForTimeout(2500);
    await page.screenshot({path: `${process.env.SHOTS}/${name}.png`});
  }
}

await browser.close();
server.close();

console.log(failures === 0 ? "\nall checks passed" : `\n${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
