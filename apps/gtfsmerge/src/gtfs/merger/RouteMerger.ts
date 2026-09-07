import {RouteID, RouteRow, RouteType, RowWriter} from "@gb-transit/gtfs-schema";
import {Sequence} from "../../sequence/Sequence";
import {close, push} from "./Push";

export class RouteMerger {

  constructor(
    private readonly routes: RowWriter<RouteRow>,
    private readonly sequence: Sequence,
    private readonly removeRouteType: RouteTypeIndex
  ) {}

  /**
   * Output and re-index all routes. A map of old route ID to new route ID is returned.
   */
  public async write(routes: RouteRow[]): Promise<RouteIndex> {
    const routeIndex: RouteIndex = {};

    for (const route of routes) {
      if (!this.removeRouteType[route.route_type]) {
        const routeId = String(this.sequence.next());

        routeIndex[route.route_id] = routeId;
        route.route_id = routeId;

        await push(this.routes, route);
      }
    }

    return routeIndex;
  }

  public end(): Promise<void> {
    return close(this.routes);
  }

}

export type RouteIndex = Record<RouteID, RouteID>;
export type RouteTypeIndex = Partial<Record<RouteType, boolean>>;
