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

  /** Ids two feeds disagreed about, counted rather than printed one by one. */
  private readonly disputed = new Set<string>();

  /**
   * Memberships are held until every feed has been read.
   *
   * A stop is published if anything in the merged feed calls at it, and the
   * merged feed is not finished until the last input has been. Checked against
   * one feed's calls, a membership in the rail feed naming a stop only the bus
   * feed serves was dropped while the stop itself was published - a group
   * quietly missing a member rather than a dangling reference.
   */
  private readonly memberships: StopAreaRow[] = [];
  private readonly published: UsedStops = {};

  constructor(
    private readonly areas: RowWriter<AreaRow>,
    private readonly stopAreas: RowWriter<StopAreaRow>
  ) {}

  public async write(
    areas: AreaRow[],
    stopAreas: StopAreaRow[],
    parentStops: ParentStops,
    published: UsedStops
  ): Promise<void> {
    for (const area of areas) {
      const id = String(area.area_id);

      // `in`, not a nullish check: an area named with an empty string has been
      // seen, and treating it as unseen made every later feed disagree with it.
      if (!(id in this.names)) {
        this.names[id] = area.area_name;
      }
      else if (this.names[id] !== area.area_name) {
        this.disputed.add(id);
      }

      await push(this.areas, area);
    }

    Object.assign(this.published, published);

    for (const stopArea of stopAreas) {
      // A call at a platform is a call at the station above it, so a membership
      // naming the platform names the station. Resolved here, against the feed
      // the membership came from, and filtered once every feed has been read.
      this.memberships.push({
        ...stopArea,
        stop_id: parentStops[stopArea.stop_id] || stopArea.stop_id
      });
    }
  }

  public async end(): Promise<void> {
    // A membership naming a stop the feed does not contain would point at a row
    // that is not there. A station counts: it is published because its platforms
    // are, and a fare area names the station rather than the platform.
    for (const membership of this.memberships) {
      if (this.published[membership.stop_id]) {
        await push(this.stopAreas, membership);
      }
    }

    // Once, with a count. A bus feed publishing Fares v2 over this repository's
    // four digit NLCs would otherwise print a line per row.
    if (this.disputed.size > 0) {
      console.warn(
        `${this.disputed.size} areas are called different things by different feeds - `
        + `${[...this.disputed].slice(0, 5).join(", ")}`
        + `${this.disputed.size > 5 ? " and more" : ""}. `
        + "The merged feed keeps the first name, and the stops of both are in the area."
      );
    }

    await Promise.all([close(this.areas), close(this.stopAreas)]);
  }

}
