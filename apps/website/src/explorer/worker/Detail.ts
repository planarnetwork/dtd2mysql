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
  /** The line it runs over, where trips.txt names one and shapes.txt has it. */
  readonly shape?: ShapeDetail;
}

/**
 * The line a trip runs over.
 *
 * The points are latitude and longitude pairs rather than rows, because this crosses a worker
 * boundary and a couple of hundred `{shape_pt_lat: "51.5"}` objects is a lot of string to post for
 * two numbers each.
 */
export interface ShapeDetail {
  readonly id: string;
  readonly points: readonly (readonly [number, number])[];
  /**
   * How many trips run over this same line.
   *
   * Worth saying because it is usually not one: a line carries every stopping pattern that runs
   * over it, so the fast and the stopper share a shape.
   */
  readonly trips: number;
  /** Kilometres end to end along the line, which is not the distance between its ends. */
  readonly length: number;
  /** Set where shapes.txt names the shape but has fewer than two points the map could use. */
  readonly undrawable?: boolean;
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

/**
 * One line, and the trips that run over it.
 *
 * A shape is a first class thing to look at rather than only a column on a trip: it is shared, so
 * "what else runs over this" is a question it can answer and a trip cannot.
 */
export interface ShapeViewDetail {
  readonly id: string;
  readonly points: readonly (readonly [number, number])[];
  readonly length: number;
  /** Capped like every other list here; `totalTrips` is the real count. */
  readonly trips: readonly {id: string, headsign?: string, routeId?: string}[];
  readonly totalTrips: number;
}

/**
 * The lines a route's trips run over, for drawing all of them at once.
 *
 * Points rather than shapes, because a route view wants a picture of where the route goes and not a
 * list of ids. A route with more distinct lines than can be told apart on one map draws the
 * busiest and says how many it left out.
 */
export interface RouteLines {
  readonly lines: readonly (readonly (readonly [number, number])[])[];
  readonly shapes: number;
  readonly drawn: number;
}

export interface RouteDetail {
  readonly id: string;
  readonly row?: Row;
  readonly agency?: Row;
  readonly trips: readonly {id: string, headsign?: string, shortName?: string, serviceId?: string}[];
  readonly totalTrips: number;
  /** Where the route's trips go, drawn. Absent where the feed has no shapes. */
  readonly lines?: RouteLines;
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
