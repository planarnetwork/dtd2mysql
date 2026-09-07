import {describe, it, expect} from "vitest";
import {AgencyRow, fileSchema} from "@gb-transit/gtfs-schema";
import {RowStream} from "./RowStream";
import {awaitStream} from "../testing/util";

const FILE = fileSchema<AgencyRow>("agency.txt", ["agency_id", "agency_name"]);

class TestStream extends RowStream<string, AgencyRow> {
  public readonly file = FILE;

  protected transform(data: string): void {
    this.pushRow({agency_id: data, agency_name: data} as AgencyRow);
  }
}

describe("RowStream", () => {

  it("emits a row per chunk, and no header", async () => {
    const stream = new TestStream();

    stream.write("a");
    stream.write("b");
    stream.end();

    return awaitStream(stream, (rows: AgencyRow[]) => {
      // The header used to be pushed by the stream, ahead of the first row.
      // The writer emits it when the file is opened, so a stream that receives
      // nothing still produces a file with a header.
      expect(rows.map(r => r.agency_id)).to.deep.equal(["a", "b"]);
    });
  });

  it("declares the file it writes and the columns of it", () => {
    expect(new TestStream().file).to.equal(FILE);
  });

  it("emits nothing when it receives nothing", async () => {
    const stream = new TestStream();

    stream.end();

    return awaitStream(stream, (rows: AgencyRow[]) => {
      expect(rows).to.deep.equal([]);
    });
  });

});
