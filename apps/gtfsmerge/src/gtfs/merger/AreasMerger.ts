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
 * and the agencies are - two feeds naming the same id mean the same thing - and
 * that assumption is weaker here than it is there. A stop id is an ATCO code and
 * an agency id a NOC, both national; an area id is unique within one areas.txt
 * and nowhere else, which is the reason a block and a shape are renumbered
 * rather than deduplicated. This repository's rail areas are four digit NLCs, so
 * a bus feed publishing Fares v2 with numeric ids could collide - and because
 * stop_areas.txt names them, a collision would put one feed's stops into the
 * other's group.
 *
 * Deduplicating instead on the id and the name would write two rows with the
 * same area_id, which is not a file any consumer can read. Renumbering would
 * make two rail feeds' "London Terminals" into two groups. So it stays as it is,
 * and says so out loud when it is provably wrong: the same id with a different
 * name is the one case where these are certainly not the same area.
 */
export class AreasMerger {

  /** What each area was called by the first feed to name it. */
  private readonly names: Record<string, string> = {};

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
      const id = String(area.area_id);
      const seen = this.names[id];

      if (seen !== undefined && seen !== area.area_name) {
        console.warn(
          `Two feeds call area ${id} different things - "${seen}" and "${area.area_name}". `
          + `The merged feed keeps "${seen}", and the stops of both are in it.`
        );
      }

      this.names[id] ??= area.area_name;

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
