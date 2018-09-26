import * as chai from "chai";
import {GTFSFileStream} from "../../src/gtfs/GTFSFileStream";
import {awaitStream} from "../util";
import {TransXChange} from "../../src/transxchange/TransXChange";

describe("GTFSFileStream", () => {

  it("emits a header if it has not been sent", async () => {
    const stream = new MockStream();

    stream.write({});
    stream.write({});
    stream.end();

    return awaitStream(stream, rows => {
      chai.expect(rows[0]).to.equal("header");
      chai.expect(rows[1]).to.equal("data");
      chai.expect(rows[2]).to.equal("data");
    });
  });
});

class MockStream extends GTFSFileStream<TransXChange> {
  protected header = "header";
  protected transform = () => this.pushLine("data");
}
