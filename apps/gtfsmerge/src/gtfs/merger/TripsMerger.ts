
import { RouteID, Trip } from "../GTFS";
import { ServiceIDMap } from "./CalendarMerger";
import { Writable } from "stream";
import { Sequence } from "../../sequence/Sequence";

export class TripsMerger {

  constructor(
    private readonly trips: Writable,
    private readonly sequence: Sequence
  ) {}

  public async write(
    trips: Trip[],
    serviceIdMap: ServiceIDMap,
    routeIdMap: Record<RouteID, RouteID>
  ): Promise<TripIDMap> {

    const tripIdMap = {};

    for (const trip of trips) {
      if (serviceIdMap[trip.service_id] && routeIdMap[trip.route_id]) {
        tripIdMap[trip.trip_id] = this.sequence.next();

        trip.trip_id = tripIdMap[trip.trip_id];
        trip.service_id = serviceIdMap[trip.service_id];
        trip.route_id = routeIdMap[trip.route_id];

        await this.push(trip);
      }
    }

    return tripIdMap;
  }

  private push(data: Trip): Promise<void> | void {
    const writable = this.trips.write(data);

    if (!writable) {
      return new Promise(resolve => this.trips.once("drain", () => resolve()));
    }
  }

  /**
   * Flush all the data to the output stream
   */
  public async end(): Promise<void[]> {
    return new Promise(resolve => this.trips.end(resolve));
  }

}

export type TripIDMap = Record<string, number>;
