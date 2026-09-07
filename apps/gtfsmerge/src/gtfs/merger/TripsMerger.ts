import {RouteID, RowWriter, TripRow} from "@gb-transit/gtfs-schema";
import {ServiceIDMap} from "./CalendarMerger";
import {Sequence} from "../../sequence/Sequence";
import {close, push} from "./Push";

export class TripsMerger {

  constructor(
    private readonly trips: RowWriter<TripRow>,
    private readonly sequence: Sequence
  ) {}

  /**
   * Output and re-index the trips whose service and route survived, and return a
   * map of old trip ID to new trip ID.
   *
   * A trip whose calendar was filtered out, or whose route type was removed, is
   * dropped here - which is what makes its stop times droppable further on.
   */
  public async write(
    trips: TripRow[],
    serviceIdMap: ServiceIDMap,
    routeIdMap: Record<RouteID, RouteID>
  ): Promise<TripIDMap> {
    const tripIdMap: TripIDMap = {};

    for (const trip of trips) {
      const service = serviceIdMap[String(trip.service_id)];
      const route = routeIdMap[trip.route_id];

      if (service !== undefined && route !== undefined) {
        const tripId = String(this.sequence.next());

        tripIdMap[trip.trip_id] = tripId;
        trip.trip_id = tripId;
        trip.service_id = service;
        trip.route_id = route;

        await push(this.trips, trip);
      }
    }

    return tripIdMap;
  }

  public end(): Promise<void> {
    return close(this.trips);
  }

}

export type TripIDMap = Record<string, string>;
