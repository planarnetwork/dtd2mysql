import type {LoadProgress} from "@gb-transit/gtfs-loader";
import type {CheckResult, Finding} from "../checks/Check.js";
import type {FeedManifest} from "../model/FeedIndex.js";
import type {Page} from "../query/Filter.js";
import {format, parse} from "../route.js";
import type {Route} from "../route.js";
import {bytes, number} from "../format.js";
import type {
  BoardDetail, RouteDetail, ServiceDetail, StopDetail, TripDetail
} from "../worker/Detail.js";
import {Explorer, startWorker, workersSupported} from "../worker/client.js";
import type {Opened} from "../worker/client.js";
import type {OpenSource} from "../worker/protocol.js";
import {element, escape, focusHeading} from "./dom.js";
import {showMap} from "./Tiles.js";
import {PAGE_SIZE, fileTable} from "./views/FileTable.js";
import {overview} from "./views/Overview.js";
import {stopView} from "./views/Stop.js";
import {tripView} from "./views/Trip.js";
import {boardView} from "./views/Board.js";
import {checksView} from "./views/Checks.js";
import {routeView, serviceView} from "./views/Simple.js";
import {validationView} from "./views/Validation.js";
import {provenanceView} from "./views/Provenance.js";
import {groups, readReport} from "../validation.js";
import type {Baseline, Group} from "../validation.js";
import {readProvenance} from "../provenance.js";
import type {ProvenanceFile} from "../provenance.js";

/**
 * The page.
 *
 * Everything above this file is pure and tested; this is the part that touches the DOM, and it is
 * kept thin on purpose. Each view is a function from state to a string, one pane's innerHTML is
 * replaced on navigation, and there is one delegated listener per kind of event. Nothing here needs
 * reconciling, which is why there is no framework under it.
 */

interface Assets {
  feed?: {file: string, path: string, bytes: number};
  sidecars: {file: string, path: string, bytes: number}[];
  /** The errors the release accepts and why, read out of .github at build time. */
  baseline: Baseline;
}

interface State {
  manifest?: FeedManifest;
  window?: {from: number, to: number};
  /**
   * The two sidecars, fetched beside a feed served from this origin. Undefined for a feed somebody
   * dropped in, which has none, and the views say so rather than rendering empty.
   */
  validation?: Group[];
  provenance?: ProvenanceFile;
  /** The request currently being rendered, so a slower answer cannot overwrite a newer one. */
  rendering: number;
}

const state: State = {rendering: 0};

let explorer: Explorer | undefined;
let base = "";

/**
 * The filter being typed into, if any.
 *
 * Rendering replaces the whole table, and the input being typed into goes with it. Putting focus
 * back has to happen after the new table is in the document - and rendering is asynchronous, because
 * the answer comes from the worker, so "after" is not the next microtask. Restoring it there was the
 * bug: focus went back to an input that was about to be thrown away.
 */
let typed: {name: string, value: string, at: number} | undefined;

export function boot(): void {
  const assets = JSON.parse(element("explorer-assets").textContent ?? "{}") as Assets;

  base = element("explorer").dataset.base ?? "";

  if (!workersSupported()) {
    return fail("This browser cannot run the explorer: it needs Web Workers, which arrived in "
      + "Safari 15 and Firefox 114. Everything the explorer shows is in the feed itself, which you "
      + "can download and read with any GTFS tool.");
  }

  explorer = new Explorer(startWorker(), {
    onProgress: showProgress,
    onOpened: opened,
    onFailed: fail
  });

  start(assets);
  loadSidecars(assets);
  wire();
}

function start(assets: Assets): void {
  const open = element("explorer-open");

  open.querySelector("[data-open-latest]")?.addEventListener("click", () => {
    openFeed({url: `${base}${assets.feed?.path ?? "/gtfs.zip"}`});
  });

  const input = open.querySelector<HTMLInputElement>("[data-file]");

  input?.addEventListener("change", () => {
    const file = input.files?.[0];

    if (file !== undefined) {
      openFeed({file});
    }
  });

  // Dropping the zip on the page is how most people will do this once they have one.
  const drop = element("explorer");

  drop.addEventListener("dragover", event => {
    event.preventDefault();
    drop.classList.add("is-dropping");
  });
  drop.addEventListener("dragleave", () => drop.classList.remove("is-dropping"));
  drop.addEventListener("drop", event => {
    event.preventDefault();
    drop.classList.remove("is-dropping");

    const file = event.dataTransfer?.files?.[0];

    if (file !== undefined) {
      openFeed({file});
    }
  });
}

function openFeed(source: OpenSource): void {
  element("explorer-open").hidden = true;
  element("explorer-app").hidden = true;
  element("explorer-loading").hidden = false;
  element("explorer-view").innerHTML = "";
  state.manifest = undefined;
  progress("Opening the feed…", undefined);
  explorer?.open(source);
}

/** Back to the landing state, so a second feed can be opened over the first. */
function closeFeed(): void {
  element("explorer-app").hidden = true;
  element("explorer-loading").hidden = true;
  element("explorer-open").hidden = false;
  state.manifest = undefined;
  location.hash = "";
}

/**
 * The two files the nightly publishes about the feed.
 *
 * Only for the feed served from this origin: they describe a build this repository did. Fetched
 * beside the feed rather than with it, and a failure costs a view rather than the page - which is
 * why nothing here is awaited before the explorer becomes usable.
 */
function loadSidecars(assets: Assets): void {
  for (const sidecar of assets.sidecars) {
    if (sidecar.file === "validation.json") {
      fetch(`${base}${sidecar.path}`)
        .then(response => response.ok ? response.json() : undefined)
        .then(json => {
          const report = readReport(json);

          state.validation = report === undefined
            ? undefined
            : groups(report, assets.baseline ?? {});
          markAvailable();
        })
        .catch(() => undefined);
    }

    if (sidecar.file === "provenance.json") {
      fetch(`${base}${sidecar.path}`)
        .then(response => response.ok ? response.json() : undefined)
        .then(json => {
          state.provenance = readProvenance(json)?.file;
          markAvailable();
        })
        .catch(() => undefined);
    }
  }
}

/** Show the two nav entries once there is something behind them. */
function markAvailable(): void {
  const nav = element("explorer-nav");

  nav.querySelector<HTMLElement>("[data-view=validation]")!.hidden = state.validation === undefined;
  nav.querySelector<HTMLElement>("[data-view=provenance]")!.hidden = state.provenance === undefined;
}

function opened(feed: Opened): void {
  state.manifest = feed.manifest;
  state.window = feed.window;

  element("explorer-loading").hidden = true;
  element("explorer-app").hidden = false;
  element("explorer-name").textContent = feed.manifest.name;
  element("explorer-calls").textContent = feed.calls === 0
    ? ""
    : `${number(feed.calls)} calls`;

  if (!feed.contiguous) {
    note("This feed does not keep each trip's calls together in stop_times.txt. That is legal, and "
      + "unusual — it was indexed the general way instead.");
  }

  rail();
  render();
}

/**
 * The files, down the side.
 *
 * Always there, because moving between files is most of what this is for. A file whose rows are not
 * counted yet says so rather than showing nothing, which is the state stop_times.txt is in until
 * somebody asks for it.
 */
function rail(): void {
  const manifest = state.manifest;

  if (manifest === undefined) {
    return;
  }

  const route = parse(location.hash);
  const here = route.view === "file" ? route.file : undefined;

  element("explorer-rail").innerHTML = `
    <p class="rail__group">Files</p>
    ${manifest.files.map(file => `
      <a href="${format({view: "file", file: file.name, page: 0, filters: {}})}"
         class="${file.name === here ? "on" : ""}">
        <span>${escape(file.name.replace(/\.txt$/, ""))}</span>
        <span class="rail__count">${number(file.rows)}</span>
      </a>`).join("")}
    ${manifest.other.length === 0 ? "" : `
      <p class="rail__group">Also in the zip</p>
      ${manifest.other.map(name =>
        `<a href="#/" aria-disabled="true"><span>${escape(name)}</span></a>`).join("")}`}`;
}

/**
 * Render whatever the hash says.
 *
 * Each request carries a number, and only the newest one is allowed to paint. Typing into a filter
 * fires a query per keystroke and they do not come back in order.
 */
async function render(): Promise<void> {
  if (explorer === undefined || state.manifest === undefined) {
    return;
  }

  const route = parse(location.hash);
  const id = ++state.rendering;
  const view = element("explorer-view");

  markNav(route);
  rail();

  try {
    const html = await html_(route, id);

    if (id !== state.rendering) {
      return; // something newer is already on its way
    }

    // The file table takes the pane whole and does its own scrolling; everything else is a document
    // and gets a measure and some air around it.
    view.innerHTML = route.view === "file"
      ? html
      : `<div class="doc${route.view === "provenance" ? " doc--wide" : ""}">${html}</div>`;

    // Moving focus to the heading is right when you have navigated somewhere, and wrong when you are
    // in the middle of typing into a filter - which is a navigation too, as far as the hash knows.
    if (!restoreTyping(route)) {
      focusHeading(view);
    }

    drawMap(view);
    scrollToRow();
  }
  catch (error) {
    if (id === state.rendering) {
      view.innerHTML = `<div class="doc"><p class="warn" role="alert">`
        + `${escape(message(error))}</p></div>`;
    }
  }
}

async function html_(route: Route, id: number): Promise<string> {
  const ask = explorer as Explorer;

  switch (route.view) {
    case "overview":
      return overview(state.manifest as FeedManifest);

    case "file": {
      const {value} = await ask.ask<Page>({
        type: "query",
        slot: "a",
        query: {
          file: route.file,
          filters: route.filters,
          ...(route.sort === undefined ? {} : {sort: route.sort}),
          ...(route.descending === undefined ? {} : {descending: route.descending}),
          offset: route.page * PAGE_SIZE,
          limit: PAGE_SIZE
        }
      });

      return fileTable(value, route);
    }

    case "stop": {
      const {value} = await ask.ask<StopDetail>({type: "stop", slot: "a", stopId: route.id});

      return stopView(value, state.window?.from);
    }

    case "trip": {
      const {value} = await ask.ask<TripDetail>({type: "trip", slot: "a", tripId: route.id});

      return tripView(value);
    }

    case "route": {
      const {value} = await ask.ask<RouteDetail>({type: "route", slot: "a", routeId: route.id});

      return routeView(value);
    }

    case "service": {
      const {value} = await ask.ask<ServiceDetail>({type: "service", slot: "a", serviceId: route.id});

      return serviceView(value);
    }

    case "board": {
      const {value} = await ask.ask<BoardDetail>({
        type: "board", slot: "a", stopId: route.id, date: route.date
      });

      return boardView(value);
    }

    case "checks": {
      // Painted once as it starts, so a run over 2.9 million rows shows its checks filling in rather
      // than a spinner and then everything at once.
      const found: Finding[] = [];

      element("explorer-view").innerHTML = `<div class="doc">${checksView([], [], true)}</div>`;

      const {value, findings} = await ask.ask<CheckResult[]>(
        {type: "checks", slot: "a", ...(route.id === undefined ? {} : {only: route.id})},
        finding => {
          found.push(finding);

          if (id === state.rendering && found.length % 50 === 0) {
            element("explorer-view").innerHTML = `<div class="doc">${checksView([], found, true)}</div>`;
          }
        }
      );

      return checksView(value, findings, false);
    }

    case "validation":
      return validationView(state.validation, route.code);

    case "provenance":
      return provenanceView(state.provenance);

    default:
      return overview(state.manifest as FeedManifest);
  }
}

/**
 * One listener per kind of event, for the whole app.
 *
 * Every link is a real href to a hash, so navigation needs no code at all - the hashchange handler
 * is the router. What is left is the handful of things that are genuinely not navigation.
 */
function wire(): void {
  addEventListener("hashchange", () => render());

  element("explorer-close").addEventListener("click", closeFeed);

  const view = element("explorer-view");

  view.addEventListener("click", event => {
    const target = event.target as HTMLElement;
    const exporter = target.closest<HTMLElement>("[data-export]");

    if (exporter !== null) {
      event.preventDefault();

      return save(exporter.dataset.export === "json" ? "json" : "csv");
    }
  });

  // A filter runs as it is typed, debounced, and lands in the URL so the view is a link.
  let typing: ReturnType<typeof setTimeout> | undefined;

  view.addEventListener("input", event => {
    const input = (event.target as HTMLElement).closest<HTMLInputElement>(".grid__filter");

    if (input === null) {
      return;
    }

    // Remembered on every keystroke rather than when the query is sent, so that what is put back
    // afterwards is what has been typed by then and not what had been typed 150ms ago.
    typed = {
      name: input.name,
      value: input.value,
      at: input.selectionStart ?? input.value.length
    };

    clearTimeout(typing);
    typing = setTimeout(() => {
      const route = parse(location.hash);

      if (route.view !== "file") {
        return;
      }

      const filters: Record<string, string> = {...route.filters};

      if (input.value.length === 0) {
        delete filters[input.name];
      }
      else {
        filters[input.name] = input.value;
      }

      location.hash = format({...route, filters, page: 0});
    }, 150);
  });

  view.addEventListener("change", event => {
    const jump = (event.target as HTMLElement).closest<HTMLInputElement>("[data-jump]");
    const route = parse(location.hash);

    if (jump === null || route.view !== "file") {
      return;
    }

    // A validator names a row by its line in the file, so that is what this takes.
    const row = Math.max(0, Number(jump.value) - 2);

    location.hash = `${format({...route, page: Math.floor(row / PAGE_SIZE)})}#row-${Number(jump.value)}`;
  });
}

async function save(format_: "csv" | "json"): Promise<void> {
  const route = parse(location.hash);

  if (route.view !== "file" || explorer === undefined) {
    return;
  }

  const {value} = await explorer.ask<{filename: string, text: string}>({
    type: "export",
    slot: "a",
    query: {
      file: route.file,
      filters: route.filters,
      ...(route.sort === undefined ? {} : {sort: route.sort}),
      ...(route.descending === undefined ? {} : {descending: route.descending}),
      offset: 0,
      limit: Number.MAX_SAFE_INTEGER
    },
    format: format_
  });

  const url = URL.createObjectURL(new Blob([value.text],
    {type: format_ === "csv" ? "text/csv" : "application/json"}));
  const link = document.createElement("a");

  link.href = url;
  link.download = value.filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * The loading screen.
 *
 * A feed is 202 MB of text and most of it is stop_times.txt, so opening one is a wait worth showing
 * rather than hiding. What is being read and how far through it we are, because "loading" on its own
 * for three seconds is indistinguishable from nothing happening.
 */
function showProgress(loading: LoadProgress): void {
  const done = loading.bytesTotal === undefined
    ? undefined
    : Math.min(100, Math.round((loading.bytesRead / loading.bytesTotal) * 100));

  progress(
    loading.phase === "building"
      ? "Indexing…"
      : `Reading ${(loading.entry ?? "the feed").replace(/^.*\//, "")}`,
    done,
    loading.rows === 0 ? "" : `${number(loading.rows)} rows`
  );
}

function progress(what: string, percent: number | undefined, detail = ""): void {
  element("explorer-loading-what").textContent = what;
  element("explorer-loading-detail").textContent = detail;

  const bar = element("explorer-loading-bar");

  bar.style.width = percent === undefined ? "0%" : `${percent}%`;
  bar.parentElement?.setAttribute("aria-valuenow", String(percent ?? 0));
}

/**
 * Draw the map on a view that has somewhere to put one.
 *
 * After the view is in the document, because the tiles are built to cover the box and the box has no
 * width until it is laid out.
 */
function drawMap(view: HTMLElement): void {
  const panel = view.querySelector<HTMLElement>("[data-map]");

  if (panel === null) {
    return;
  }

  const [lat, lon] = (panel.dataset.map ?? "").split(",").map(Number);

  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    showMap(panel, lat, lon);
  }
}

/**
 * Put the reader back in the filter they were typing into.
 *
 * The value is the one they have typed by now rather than the one the URL was built from: a keystroke
 * landing while the query was in flight would otherwise vanish from the box for a moment, even though
 * the next query would have picked it up.
 */
function restoreTyping(route: Route): boolean {
  // Leaving the file ends it. Not focusout: removing a focused input fires that, so the state the
  // restore needs would be cleared by the very render it is there to survive.
  if (route.view !== "file") {
    typed = undefined;
  }

  if (typed === undefined) {
    return false;
  }

  const input = document.querySelector<HTMLInputElement>(
    `.grid__filter[name="${CSS.escape(typed.name)}"]`);

  if (input === null) {
    typed = undefined;

    return false;
  }

  if (input.value !== typed.value) {
    input.value = typed.value;
  }

  input.focus();
  input.setSelectionRange(typed.at, typed.at);

  return true;
}

function markNav(route: Route): void {
  for (const link of document.querySelectorAll<HTMLAnchorElement>("#explorer-nav a[data-view]")) {
    link.classList.toggle("on", link.dataset.view === route.view);
  }
}

/** A row linked to by number is highlighted, because a page of 200 rows is not a needle. */
function scrollToRow(): void {
  const at = location.hash.match(/#row-(\d+)$/);

  if (at === null) {
    return;
  }

  const row = element("explorer-view").querySelectorAll("tbody tr")[Number(at[1]) - 2];

  row?.classList.add("found");
  row?.scrollIntoView({block: "center", behavior: "auto"});
}

function fail(text: string): void {
  element("explorer-loading").hidden = true;
  element("explorer-app").hidden = false;
  element("explorer-open").hidden = true;
  element("explorer-view").innerHTML =
    `<div class="doc"><p class="warn" role="alert">${escape(text)}</p></div>`;
}

function note(text: string): void {
  const status = element("explorer-note");

  status.hidden = false;
  status.textContent = text;
  setTimeout(() => status.hidden = true, 12000);
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
