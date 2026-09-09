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
 *
 * **A trip naming a shape the feed has no points for keeps that name, and the
 * merged feed has a dangling reference.** The trips are written in the first
 * pass and the shapes only read in the second, so at the point a trip is
 * numbered there is no knowing whether any point will arrive for it, and finding
 * out would mean inflating the 2.5GB in the first pass to answer a question
 * about the second. Both Bus Open Data Service feeds checked - Wales and the
 * national one - name 4,000 and 42,233 shapes and have points for every one, so
 * this is a guard against a bad input rather than a case seen in the wild.
 * `end` says how many there were, so a bad input is in the log rather than in
 * somebody's validator report.
 */
export class ShapesMerger {

  private readonly passes: ShapesPass[] = [];

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
    const pass = new ShapesPass(this.shapes, shapeIdMap);

    this.passes.push(pass);

    return pass;
  }

  public end(): Promise<void> {
    const missing = this.passes.reduce((total, pass) => total + pass.missing(), 0);

    if (missing > 0) {
      console.warn(
        `${missing} shapes are named by a trip and have no points in the feed they came from. `
        + "The trips still name them, so the merged feed points at shapes that are not in it."
      );
    }

    return close(this.shapes);
  }

}

export class ShapesPass {

  private readonly batch: ShapeRow[] = [];

  /** The shapes points actually arrived for, as the feed named them. */
  private readonly drawn = new Set<string>();

  constructor(
    private readonly shapes: RowWriter<ShapeRow>,
    private readonly shapeIdMap: ShapeIDMap
  ) {}

  public row(row: ShapeRow): void {
    const shapeId = this.shapeIdMap[row.shape_id];

    if (shapeId !== undefined) {
      this.drawn.add(String(row.shape_id));

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

  /** Shapes a surviving trip names that no point ever arrived for. */
  public missing(): number {
    return Object.keys(this.shapeIdMap).filter(shape => !this.drawn.has(shape)).length;
  }

}
