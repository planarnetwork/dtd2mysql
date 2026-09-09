import {FrequencyRow, RowWriter} from "@gb-transit/gtfs-schema";
import {TripIDMap} from "./TripsMerger";
import {close, push} from "./Push";

/**
 * A trip that runs every so many minutes rather than at written down times.
 *
 * Held rather than streamed, unlike the calls and the shapes it sits beside: the
 * whole national bus feed has 81 of these rows. Written after the trips, because
 * every one of them names a trip that has just been renumbered, and dropped
 * along with a trip that did not survive.
 */
export class FrequenciesMerger {

  constructor(
    private readonly frequencies: RowWriter<FrequencyRow>
  ) {}

  public async write(frequencies: FrequencyRow[], tripIdMap: TripIDMap): Promise<void> {
    for (const frequency of frequencies) {
      const tripId = tripIdMap[frequency.trip_id];

      if (tripId !== undefined) {
        await push(this.frequencies, {...frequency, trip_id: tripId});
      }
    }
  }

  public end(): Promise<void> {
    return close(this.frequencies);
  }

}
