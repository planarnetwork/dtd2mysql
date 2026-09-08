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
import type {OpenPhase, OpenSource} from "../worker/protocol.js";
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
 * kept thin on purpose. Each view is a function from state to a string, the container's innerHTML is
 * replaced on navigation, and there is one delegated click listener and one delegated input
 * listener. Nothing here needs reconciling, which is why there is no framework under it.
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
  callsLoaded: boolean;
  callRows?: number;
  /**
   * The two sidecars, fetched beside a feed served from this origin. Undefined for a feed somebody
   * dropped in, which has none, and the views say so rather than rendering empty.
   */
  validation?: Group[];
  provenance?: ProvenanceFile;
  /** The request currently being rendered, so a slower answer cannot overwrite a newer one. */
  rendering: number;
}

const state: State = {callsLoaded: false, rendering: 0};

let explorer: Explorer | undefined;
let base = "";

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
    onCalls: (rows, contiguous) => {
      state.callsLoaded = true;
      state.callRows = rows;

      if (!contiguous) {
        note("This feed does not keep each trip's calls together in stop_times.txt. That is legal, "
          + "and unusual — it was indexed the general way instead.");
      }

      render();
    },
    onFailed: fail
  });

  start(assets);
  loadSidecars(assets);
  wire();
}

function start(assets: Assets): void {
  const open = element("explorer-open");

  if (assets.feed !== undefined) {
    open.querySelector("[data-open-latest]")?.addEventListener("click", () => {
      openFeed({url: `${base}${assets.feed!.path}`});
    });
  }

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
    drop.classList.add("x-dropping");
  });
  drop.addEventListener("dragleave", () => drop.classList.remove("x-dropping"));
  drop.addEventListener("drop", event => {
    event.preventDefault();
    drop.classList.remove("x-dropping");

    const file = event.dataTransfer?.files?.[0];

    if (file !== undefined) {
      openFeed({file});
    }
  });
}

function openFeed(source: OpenSource): void {
  element("explorer-open").hidden = true;
  element("explorer-status").hidden = false;
  element("explorer-view").innerHTML = "";
  state.manifest = undefined;
  state.callsLoaded = false;
  state.validation = undefined;
  state.provenance = undefined;
  explorer?.open(source);
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

function opened(manifest: FeedManifest, window?: {from: number, to: number}): void {
  state.manifest = manifest;
  state.window = window;

  element("explorer-status").hidden = true;
  element("explorer-nav").hidden = false;
  element("explorer-name").textContent = manifest.name;

  const calls = manifest.files.find(file => file.name === "stop_times.txt");

  // The second phase is offered with its cost on the button rather than started quietly. On the
  // published feed it is 2.9 million rows, a few seconds of work and a few hundred megabytes of
  // peak memory, and a phone may not have it to give.
  const button = element("explorer-load-calls");

  if (calls === undefined) {
    button.hidden = true;
  }
  else {
    button.hidden = false;
    button.textContent = `Load the calls — about ${bytes(calls.originalSize ?? 0)} of `
      + "stop_times.txt. Needed for the trip view, the board and half the checks.";
  }

  render();
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

  try {
    const html = await html_(route, id);

    if (id !== state.rendering) {
      return; // something newer is already on its way
    }

    view.innerHTML = html;
    focusHeading(view);
    scrollToRow();
  }
  catch (error) {
    if (id === state.rendering) {
      view.innerHTML = `<p class="x-warn" role="alert">${escape(message(error))}</p>`;
    }
  }
}

async function html_(route: Route, id: number): Promise<string> {
  const ask = explorer as Explorer;

  switch (route.view) {
    case "overview":
      return overview(state.manifest as FeedManifest, state.callsLoaded);

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

      element("explorer-view").innerHTML = checksView([], [], true);

      const {value, findings} = await ask.ask<CheckResult[]>(
        {type: "checks", slot: "a", ...(route.id === undefined ? {} : {only: route.id})},
        finding => {
          found.push(finding);

          if (id === state.rendering && found.length % 50 === 0) {
            element("explorer-view").innerHTML = checksView([], found, true);
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
      return overview(state.manifest as FeedManifest, state.callsLoaded);
  }
}

/**
 * One click listener and one input listener for the whole page.
 *
 * Every link is a real href to a hash, so navigation needs no code at all - the hashchange handler
 * is the router. What is left is the handful of things that are genuinely not navigation.
 */
function wire(): void {
  addEventListener("hashchange", () => render());

  element("explorer-load-calls").addEventListener("click", () => {
    element("explorer-load-calls").hidden = true;
    element("explorer-status").hidden = false;
    explorer?.loadCalls();
  });

  const view = element("explorer-view");

  view.addEventListener("click", event => {
    const target = event.target as HTMLElement;
    const map = target.closest<HTMLElement>("[data-map]");

    if (map !== null) {
      const [lat, lon] = (map.dataset.map ?? "").split(",").map(Number);

      // The one third-party request the site makes, and only ever from here, after a button that
      // said what it would do.
      return showMap(map.parentElement as HTMLElement, lat, lon);
    }

    const exporter = target.closest<HTMLElement>("[data-export]");

    if (exporter !== null) {
      event.preventDefault();

      return save(exporter.dataset.export === "json" ? "json" : "csv");
    }
  });

  // A filter runs as it is typed, debounced, and lands in the URL so the view is a link.
  let typing: ReturnType<typeof setTimeout> | undefined;

  view.addEventListener("input", event => {
    const input = (event.target as HTMLElement).closest<HTMLInputElement>(".x-filter");

    if (input === null) {
      return;
    }

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

      const cursor = input.selectionStart;

      location.hash = format({...route, filters, page: 0});
      // Replacing the table takes the focused input with it, so it is put back where it was.
      queueMicrotask(() => {
        const again = document.querySelector<HTMLInputElement>(
          `.x-filter[name="${CSS.escape(input.name)}"]`);

        again?.focus();
        again?.setSelectionRange(cursor, cursor);
      });
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

function showProgress(phase: OpenPhase, progress: LoadProgress): void {
  const status = element("explorer-status");
  const done = progress.bytesTotal === undefined
    ? undefined
    : Math.round((progress.bytesRead / progress.bytesTotal) * 100);

  status.hidden = false;
  status.textContent = phase === "calls"
    ? `Reading the calls… ${number(progress.rows)} rows`
    : `Reading ${progress.entry ?? "the feed"}…${done === undefined ? "" : ` ${done}%`}`;
}

function markNav(route: Route): void {
  for (const link of document.querySelectorAll<HTMLAnchorElement>("#explorer-nav a[data-view]")) {
    link.classList.toggle("x-on", link.dataset.view === route.view);
  }
}

/** A row linked to by number is highlighted, because a table of 200 rows is not a needle. */
function scrollToRow(): void {
  const at = location.hash.match(/#row-(\d+)$/);

  if (at === null) {
    return;
  }

  const row = element("explorer-view").querySelectorAll("tbody tr")[Number(at[1]) - 2];

  row?.classList.add("x-row--found");
  row?.scrollIntoView({block: "center", behavior: "auto"});
}

function fail(text: string): void {
  element("explorer-status").hidden = true;
  element("explorer-view").innerHTML = `<p class="x-warn" role="alert">${escape(text)}</p>`;
}

function note(text: string): void {
  const status = element("explorer-note");

  status.hidden = false;
  status.textContent = text;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
