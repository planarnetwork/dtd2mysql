import {RouteID, RowWriter, TripRow} from "@gb-transit/gtfs-schema";
import {ServiceIDMap} from "./CalendarMerger";
import {Sequence} from "../../sequence/Sequence";
import {close, push} from "./Push";

export class TripsMerger {

  constructor(
    private readonly trips: RowWriter<TripRow>,
    private readonly sequence: Sequence,
    private readonly blocks: Sequence,
    private readonly shapes: Sequence
  ) {}

  /**
   * Output and re-index the trips whose service and route survived, and return
   * maps of old id to new for the trips, the blocks and the shapes.
   *
   * A trip whose calendar was filtered out, or whose route type was removed, is
   * dropped here - which is what makes its stop times droppable further on.
   *
   * The blocks and the shapes are renumbered for the same reason the trips are,
   * and the maps are made fresh for each feed: a block is one vehicle working
   * through a day and a shape is one line on the ground, both of them named by
   * the feed that published them and by nobody else. Two feeds numbering a block
   * `1` do not mean the same vehicle, and carrying both across unchanged would
   * say a bus continues as a train.
   */
  public async write(
    trips: TripRow[],
    serviceIdMap: ServiceIDMap,
    routeIdMap: Record<RouteID, RouteID>
  ): Promise<[TripIDMap, ShapeIDMap]> {
    const tripIdMap: TripIDMap = {};
    const shapeIdMap: ShapeIDMap = {};
    const blockIdMap: Record<string, string> = {};

    for (const trip of trips) {
      const service = serviceIdMap[String(trip.service_id)];
      const route = routeIdMap[trip.route_id];

      if (service !== undefined && route !== undefined) {
        const tripId = String(this.sequence.next());

        tripIdMap[trip.trip_id] = tripId;
        trip.trip_id = tripId;
        trip.service_id = service;
        trip.route_id = route;

        if (trip.block_id) {
          trip.block_id = blockIdMap[trip.block_id] ??= String(this.blocks.next());
        }

        if (trip.shape_id) {
          trip.shape_id = shapeIdMap[trip.shape_id] ??= String(this.shapes.next());
        }

        await push(this.trips, trip);
      }
    }

    return [tripIdMap, shapeIdMap];
  }

  public end(): Promise<void> {
    return close(this.trips);
  }

}

export type TripIDMap = Record<string, string>;

/** Old shape id to new, for the feed being merged. */
export type ShapeIDMap = Record<string, string>;
