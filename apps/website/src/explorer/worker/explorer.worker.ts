import {Calendars, feedWindow} from "../model/Calendar.js";
import type {FeedIndex} from "../model/FeedIndex.js";
import {Links} from "../model/Links.js";
import {openFeed} from "../model/OpenFeed.js";
import {run} from "../query/Filter.js";
import {tableOf} from "../query/Table.js";
import {toCSV, toJSON} from "../query/Export.js";
import {CHECKS} from "../checks/checks.js";
import {runCheck} from "../checks/Check.js";
import {boardAt, routeDetail, serviceDetail, stopDetail, tripDetail} from "./Details.js";
import {Provenance, readProvenance} from "../provenance.js";
import type {Request, Response, Slot} from "./protocol.js";

/**
 * The worker the whole explorer runs in.
 *
 * Reading a 21 MB feed is three seconds of solid CPU on a desktop and fifteen on a phone. On the
 * main thread that is a frozen page and a browser offering to kill the tab, so none of it happens
 * there - the page sends messages and renders what comes back.
 *
 * The zip's bytes are kept for the life of the session, so a column the stores do not hold can be
 * fetched by rescanning rather than by downloading the feed again.
 */

// The repository's tsconfig has lib dom, which a worker is not, and adding lib webworker conflicts
// with it. Five lines of local declaration is cheaper than a second tsconfig.
declare const self: {
  postMessage(message: Response): void;
  onmessage: ((event: {data: Request}) => void) | null;
};

interface Loaded {
  feed: FeedIndex;
  bytes: Uint8Array;
  calendars: Calendars;
  links: Links;
  provenance?: Provenance;
}

const slots = new Map<Slot, Loaded>();

self.onmessage = event => {
  handle(event.data).catch(error => self.postMessage({
    type: "failed",
    id: "id" in event.data ? event.data.id : null,
    message: message(error)
  }));
};

async function handle(request: Request): Promise<void> {
  if (request.type === "open") {
    return open(request.slot, request.source);
  }
  const loaded = slots.get(request.slot);

  if (loaded === undefined) {
    throw new Error("No feed is open.");
  }

  switch (request.type) {
    case "query": {
      const table = tableOf(loaded.feed, request.query.file);

      if (table === undefined) {
        throw new Error(`The feed has no ${request.query.file}.`);
      }

      return result(request.id, run(table, request.query));
    }

    case "stop":
      return result(request.id, stopDetail(loaded, request.stopId));

    case "trip":
      return result(request.id, tripDetail(loaded, request.tripId));

    case "route":
      return result(request.id, routeDetail(loaded, request.routeId));

    case "service":
      return result(request.id, serviceDetail(loaded, request.serviceId));

    case "board":
      return result(request.id, boardAt(loaded, request.stopId, request.date));

    case "export": {
      const table = tableOf(loaded.feed, request.query.file);

      if (table === undefined) {
        throw new Error(`The feed has no ${request.query.file}.`);
      }

      // No limit: an export is for taking away, so it is the whole of what was filtered rather than
      // the page that happened to be on screen.
      const page = run(table, {...request.query, offset: 0, limit: Number.MAX_SAFE_INTEGER});

      return result(request.id, {
        filename: `${request.query.file.replace(/\.txt$/, "")}.${request.format}`,
        text: request.format === "csv" ? toCSV(page) : toJSON(page)
      });
    }

    case "checks": {
      const context = {feed: loaded.feed, calendars: loaded.calendars, links: loaded.links};
      const results = [];

      for (const check of CHECKS) {
        if (request.only !== undefined && check.id !== request.only) {
          continue;
        }

        // Findings are posted as they are found, so a check over 2.9 million rows fills its list in
        // rather than appearing all at once at the end.
        results.push(runCheck(check, context, finding =>
          self.postMessage({type: "finding", id: request.id, finding})));
      }

      return result(request.id, results);
    }
  }
}

async function open(slot: Slot, source: {url: string} | {file: File}): Promise<void> {
  const bytes = "file" in source
    ? new Uint8Array(await source.file.arrayBuffer())
    : await download(source.url);

  const feed = await openFeed(name(source), bytes, {
    onProgress: progress => self.postMessage({type: "progress", slot, progress})
  });

  slots.set(slot, {
    feed,
    bytes,
    calendars: new Calendars(feed.files.get("calendar.txt"), feed.files.get("calendar_dates.txt")),
    links: new Links(feed.files.get("transfers.txt")),
    provenance: "url" in source ? await provenanceBeside(source.url) : undefined
  });

  self.postMessage({
    type: "opened",
    slot,
    manifest: feed.manifest,
    window: feedWindow(feed),
    calls: feed.calls?.rows ?? 0,
    contiguous: feed.byTrip?.contiguous ?? true
  });
}


/**
 * The bytes of the feed, held whole.
 *
 * Read into memory rather than streamed straight into the parser, so that a column the stores do not
 * hold can be fetched later by reading these bytes again rather than by downloading 21 MB twice.
 */
async function download(url: string): Promise<Uint8Array> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`${url} answered ${response.status}. The feed may not have been published yet.`);
  }

  return new Uint8Array(await response.arrayBuffer());
}

/**
 * The enrichment ledger published beside the feed, where there is one.
 *
 * Only for a feed served from this origin: a ledger is written by this repository's build and a feed
 * somebody drops in has none. A failure here costs the stop view its provenance panel and nothing
 * else, so it is swallowed rather than raised.
 */
async function provenanceBeside(url: string): Promise<Provenance | undefined> {
  try {
    const response = await fetch(url.replace(/[^/]+$/, "provenance.json"));

    return response.ok ? readProvenance(await response.json()) : undefined;
  }
  catch {
    return undefined;
  }
}

function result(id: number, value: unknown): void {
  self.postMessage({type: "result", id, value});
  self.postMessage({type: "done", id});
}

function name(source: {url: string} | {file: File}): string {
  return "file" in source ? source.file.name : (source.url.split("/").pop() ?? "gtfs.zip");
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
