import { Route, RouteID, RouteType, StopID, StopTime } from "../GTFS";
import { TripIDMap } from "./TripsMerger";
import { ParentStops } from "./StopsAndTransfersMerger";
import { Writable } from "stream";
import { Sequence } from "../../sequence/Sequence";

export class RouteMerger {

  constructor(
    private readonly routes: Writable,
    private readonly sequence: Sequence,
    private readonly removeRouteType: RouteTypeIndex
  ) {}

  /**
   * Output and re-index all routes. A map of old route ID to new route ID is returned.
   */
  public async write(routes: Route[]): Promise<RouteIndex> {
    const routeIndex = {};

    for (const route of routes) {
      if (!this.removeRouteType[route.route_type]) {
        const routeId = this.sequence.next();

        routeIndex[route.route_id] = routeId;
        route.route_id = routeId;

        await this.push(route);
      }
    }

    return routeIndex;
  }

  private push(data: Route): Promise<void> | void {
    const writable = this.routes.write(data);

    if (!writable) {
      return new Promise(resolve => this.routes.once("drain", resolve));
    }
  }

  /**
   * Flush all the data to the output stream
   */
  public async end(): Promise<void[]> {
    return new Promise(resolve => this.routes.end(resolve));
  }

}

export type RouteIndex = Record<RouteID, RouteID>;
export type RouteTypeIndex = Record<RouteType, boolean>;
