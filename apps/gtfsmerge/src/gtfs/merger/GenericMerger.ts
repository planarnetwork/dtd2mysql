import {AgencyRow, RowWriter} from "@gb-transit/gtfs-schema";
import {close, push} from "./Push";

/**
 * Pass the rows through to the output, which is all agency.txt needs: the file
 * is deduplicated by the writer's key, and nothing about an agency is re-indexed.
 */
export class GenericMerger {

  constructor(
    private readonly writer: RowWriter<AgencyRow>
  ) {}

  public async write(items: AgencyRow[]): Promise<void> {
    for (const item of items) {
      await push(this.writer, item);
    }
  }

  public end(): Promise<void> {
    return close(this.writer);
  }

}
