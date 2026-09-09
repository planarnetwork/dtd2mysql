import {describe, it, expect} from "vitest";
import {ShapeRow} from "@gb-transit/gtfs-schema";
import {ShapesMerger, ShapesPass} from "./ShapesMerger";
import {collect} from "./Fixtures";

const point = (shape: string, sequence: number): ShapeRow => ({
  shape_id: shape, shape_pt_lat: "54.00000", shape_pt_lon: "-1.00000",
  shape_pt_sequence: sequence, shape_dist_traveled: null
});

/** One chunk of the reader's rows, the same row object reused throughout. */
async function chunk(pass: ShapesPass, rows: ShapeRow[]): Promise<void> {
  const reused = {} as ShapeRow;

  for (const row of rows) {
    pass.row(Object.assign(reused, row));
  }

  await pass.flush();
}

describe("ShapesMerger", () => {

  it("renumbers a point onto the id its trips were given", async () => {
    const shapes = collect<ShapeRow>();
    const pass = new ShapesMerger(shapes).begin({SHP1: "1"});

    await chunk(pass, [point("SHP1", 1), point("SHP1", 2)]);

    expect(shapes.rows.map(row => row.shape_id)).to.deep.equal(["1", "1"]);
    expect(shapes.rows.map(row => row.shape_pt_sequence)).to.deep.equal([1, 2]);
  });

  /**
   * A shape is only in the feed because a trip is drawn along it, so a shape no
   * surviving trip names is 2.5GB of line nothing refers to.
   */
  it("drops a shape no surviving trip is drawn along", async () => {
    const shapes = collect<ShapeRow>();
    const pass = new ShapesMerger(shapes).begin({SHP1: "1"});

    await chunk(pass, [point("SHP1", 1), point("ORPHAN", 1)]);

    expect(shapes.rows.map(row => row.shape_id)).to.deep.equal(["1"]);
  });

  it("keeps each point as it was when it arrived", async () => {
    const shapes = collect<ShapeRow>();
    const pass = new ShapesMerger(shapes).begin({SHP1: "1", SHP2: "2"});

    await chunk(pass, [point("SHP1", 1), point("SHP2", 1), point("SHP1", 2)]);

    expect(shapes.rows.map(row => `${row.shape_id}:${row.shape_pt_sequence}`))
      .to.deep.equal(["1:1", "2:1", "1:2"]);
  });

});
