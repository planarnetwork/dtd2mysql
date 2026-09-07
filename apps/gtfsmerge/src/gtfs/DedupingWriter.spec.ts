import {describe, it, expect} from "vitest";
import {StopRow} from "@gb-transit/gtfs-schema";
import {DedupingWriter} from "./DedupingWriter";
import {collect, stop} from "./merger/Fixtures";

describe("DedupingWriter", () => {

  it("writes a key once", () => {
    const rows = collect<StopRow>();
    const writer = new DedupingWriter(rows, row => row.stop_id);

    writer.write(stop("a", 1, 1));
    writer.write(stop("a", 1, 1));
    writer.write(stop("b", 1, 1));

    expect(rows.rows.map(r => r.stop_id)).to.deep.equal(["a", "b"]);
  });

});
