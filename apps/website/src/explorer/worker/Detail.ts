import type {Row} from "@gb-transit/gtfs-loader";
import type {ServiceDate} from "../model/Calendar.js";
import type {FieldHistory} from "../provenance.js";

/**
 * What the entity views are handed.
 *
 * Everything here is a plain object, because it is posted across a worker boundary. That is also why
 * the joining happens on the worker's side: it holds the indexes, and sending a page a stop row and
 * letting it go looking for the platforms underneath would mean sending it stops.txt as well.
 */

export interface StopDetail {
  readonly id: string;
  /** Absent when the feed has no such stop, which is itself the answer to some questions. */
  readonly row?: Row;
  readonly rowIndex?: number;
  /** The station this is a boarding point of, where it has one. */
  readonly parent?: Row;
  /** The boarding points under this station, where it is one. */
  readonly children: readonly {row: Row, index: number, metresFromParent?: number}[];
  /** How many calls the feed makes here, across this stop and its children. */
  readonly calls?: number;
  readonly childCalls?: number;
  /** transfers.txt and links.txt rows naming this stop at either end. */
  readonly transfers: readonly Row[];
  readonly links: readonly Row[];
  /**
   * What the enrichers wrote here, and what they overruled. The answer to "why is this station in
   * the wrong place", where the release published a ledger.
   */
  readonly provenance: readonly FieldHistory[];
}

export interface TripDetail {
  readonly id: string;
  readonly row?: Row;
  readonly rowIndex?: number;
  readonly route?: Row;
  readonly agency?: Row;
  readonly calls: readonly CallDetail[];
  readonly calendar?: Row;
  /** The feed's window, expanded, with the exclusions marked. */
  readonly dates: readonly ServiceDate[];
  readonly runs?: number;
  /** The trips this one's vehicle carries on as, and the ones that carried on as it. */
  readonly onward: readonly LinkDetail[];
  readonly prior: readonly LinkDetail[];
}

export interface CallDetail {
  readonly row: number;
  readonly stopId?: string;
  readonly stopName?: string;
  readonly parentId?: string;
  readonly platform?: string;
  readonly sequence: number;
  readonly arrival?: string;
  readonly departure?: string;
  readonly pickup: number;
  readonly dropOff: number;
  readonly timepoint?: boolean;
}

export interface LinkDetail {
  readonly tripId: string;
  readonly stopId?: string;
  readonly stopName?: string;
  readonly headsign?: string;
  readonly row: number;
}

export interface RouteDetail {
  readonly id: string;
  readonly row?: Row;
  readonly agency?: Row;
  readonly trips: readonly {id: string, headsign?: string, shortName?: string, serviceId?: string}[];
  readonly totalTrips: number;
}

export interface ServiceDetail {
  readonly id: string;
  readonly row?: Row;
  readonly exceptions: readonly Row[];
  readonly dates: readonly ServiceDate[];
  readonly trips: readonly {id: string, headsign?: string, routeId?: string}[];
  readonly totalTrips: number;
}

export interface BoardDetail {
  readonly stopId: string;
  readonly stopName?: string;
  readonly date: number;
  readonly departures: readonly Departure[];
}

export interface Departure {
  readonly tripId: string;
  readonly time: string;
  /** Seconds from the start of the service day, so 24:35 sorts after 23:50 rather than before it. */
  readonly seconds: number;
  readonly platform?: string;
  readonly headsign?: string;
  readonly shortName?: string;
  readonly destination?: string;
  readonly pickup: number;
  /**
   * Set where the departure belongs to the previous service day, which is where a train leaving at
   * 24:35 on Tuesday's service actually goes on Wednesday morning's board.
   */
  readonly previousDay?: boolean;
}
