import type {LoadProgress} from "@gb-transit/gtfs-loader";
import type {FeedManifest} from "../model/FeedIndex.js";
import type {Page, Query} from "../query/Filter.js";
import type {Finding} from "../checks/Check.js";
import type {StopDetail, TripDetail, BoardDetail, RouteDetail, ServiceDetail} from "./Detail.js";

/**
 * What the page says to the worker and what it hears back.
 *
 * Imported by both sides, so a change to it breaks the build rather than the page. That matters more
 * than usual here: the two halves are separate bundles and nothing else would catch a message one of
 * them stopped understanding.
 */

/**
 * Which of the two feeds a message is about.
 *
 * Only "a" is used. It is here so that comparing two feeds is a feature rather than a rewrite, and
 * it costs one field to keep the door open.
 */
export type Slot = "a" | "b";

export type Request =
  | {type: "open", slot: Slot, source: OpenSource}
  | {type: "query", slot: Slot, id: number, query: Query}
  | {type: "stop", slot: Slot, id: number, stopId: string}
  | {type: "trip", slot: Slot, id: number, tripId: string}
  | {type: "route", slot: Slot, id: number, routeId: string}
  | {type: "service", slot: Slot, id: number, serviceId: string}
  | {type: "board", slot: Slot, id: number, stopId: string, date: number}
  | {type: "checks", slot: Slot, id: number, only?: string}
  | {type: "export", slot: Slot, id: number, query: Query, format: "csv" | "json"};

export type OpenSource = {url: string} | {file: File};

export type Response =
  | {type: "progress", slot: Slot, progress: LoadProgress}
  | {type: "opened", slot: Slot, manifest: FeedManifest, window?: {from: number, to: number},
      calls: number, contiguous: boolean}
  | {type: "result", id: number, value: unknown}
  /** Streamed one at a time, so a long check fills its list in rather than appearing at the end. */
  | {type: "finding", id: number, finding: Finding}
  | {type: "done", id: number}
  | {type: "failed", id: number | null, message: string};

/** Typed results, so a view is not handed `unknown` and left to hope. */
export interface Results {
  query: Page;
  stop: StopDetail;
  trip: TripDetail;
  route: RouteDetail;
  service: ServiceDetail;
  board: BoardDetail;
  export: {filename: string, text: string};
}
