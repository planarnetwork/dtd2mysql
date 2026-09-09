import {RowWriter, ShapeRow} from "@gb-transit/gtfs-schema";
import {ShapeIDMap} from "./TripsMerger";
import {close, push} from "./Push";

/**
 * The line a trip is drawn along.
 *
 * Streamed rather than held, for the reason the stop times are: a national bus
 * feed's shapes.txt is 2.5GB, more than the calls themselves. It is read in the
 * same pass as the calls, which is possible because the map it needs was built
 * from the trips in the pass before.
 */
export class ShapesMerger {

  constructor(
    private readonly shapes: RowWriter<ShapeRow>
  ) {}

  /**
   * Start writing the shapes of one feed.
   *
   * A shape no surviving trip is drawn along is dropped, which covers both a
   * shape whose trips were filtered out and a shape nothing referenced in the
   * first place.
   */
  public begin(shapeIdMap: ShapeIDMap): ShapesPass {
    return new ShapesPass(this.shapes, shapeIdMap);
  }

  public end(): Promise<void> {
    return close(this.shapes);
  }

}

export class ShapesPass {

  private readonly batch: ShapeRow[] = [];

  constructor(
    private readonly shapes: RowWriter<ShapeRow>,
    private readonly shapeIdMap: ShapeIDMap
  ) {}

  public row(row: ShapeRow): void {
    const shapeId = this.shapeIdMap[row.shape_id];

    if (shapeId !== undefined) {
      // Copied because the reader hands back the same object every time, and
      // this one is not written until the chunk it arrived in has been read.
      this.batch.push({...row, shape_id: shapeId});
    }
  }

  public async flush(): Promise<void> {
    for (const row of this.batch) {
      await push(this.shapes, row);
    }

    this.batch.length = 0;
  }

}
