import {RowWriter} from "@gb-transit/gtfs-schema";
import {close, push} from "./Push";

/**
 * Pass the rows through to the output, which is all agency.txt and
 * attributions.txt need: both are deduplicated by the writer's key, and nothing
 * in either is re-indexed.
 */
export class GenericMerger<T> {

  constructor(
    private readonly writer: RowWriter<T>
  ) {}

  public async write(items: T[]): Promise<void> {
    for (const item of items) {
      await push(this.writer, item);
    }
  }

  public end(): Promise<void> {
    return close(this.writer);
  }

}
