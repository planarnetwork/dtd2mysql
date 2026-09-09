import {AreaRow, RowWriter, StopAreaRow} from "@gb-transit/gtfs-schema";
import {UsedStops} from "./StopTimesMerger";
import {ParentStops} from "./StopsAndTransfersMerger";
import {close, push} from "./Push";

/**
 * Fares v2 areas, and which stops belong to them.
 *
 * A rail feed publishes these to say what a ticket to a group of stations means:
 * "London Terminals" is Euston, Waterloo, King's Cross and fifteen others, and a
 * rider holding a ticket to it needs to know which stations that is. A merge
 * that wrote neither file turned a feed that answered the question into one that
 * did not.
 *
 * The areas themselves are deduplicated by id, on the same assumption the stops
 * and the agencies are: two feeds naming the same id mean the same thing.
 */
export class AreasMerger {

  constructor(
    private readonly areas: RowWriter<AreaRow>,
    private readonly stopAreas: RowWriter<StopAreaRow>
  ) {}

  public async write(
    areas: AreaRow[],
    stopAreas: StopAreaRow[],
    parentStops: ParentStops,
    usedStops: UsedStops
  ): Promise<void> {
    for (const area of areas) {
      await push(this.areas, area);
    }

    for (const stopArea of stopAreas) {
      // The same two moves transfers.txt makes: a call at a platform is a call
      // at the station above it, and a stop nothing calls at is not published,
      // so a membership naming one would point at a row that is not there.
      const stopId = parentStops[stopArea.stop_id] || stopArea.stop_id;

      if (usedStops[stopId]) {
        await push(this.stopAreas, {...stopArea, stop_id: stopId});
      }
    }
  }

  public async end(): Promise<void> {
    await Promise.all([close(this.areas), close(this.stopAreas)]);
  }

}
