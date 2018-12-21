import * as chai from "chai";
import {GTFSFileStream} from "../src/GTFSFileStream";

describe("GTFSFileStream", () => {

  it("Sends the header first", () => {
    const mock = new MockStream();
    const stream = new GTFSFileStream(mock as any, ["field1", "field2"]);
    const expected = "field1,field2\na,b\n";

    stream.write({ field1: "a", field2: "b" });

    chai.expect(mock.data).to.deep.equal(expected);
  });

  it("Does not send duplicate items", () => {
    const mock = new MockStream();
    const stream = new GTFSFileStream(mock as any, ["field1", "field2"], "field1");
    const expected = "field1,field2\na,b\nb,c\n";

    stream.write({ field1: "a", field2: "b" });
    stream.write({ field1: "a", field2: "c" });
    stream.write({ field1: "b", field2: "c" });

    chai.expect(mock.data).to.deep.equal(expected);
  });

});

class MockStream {
  public data = "";

  public write(chunk: any) {
    this.data += chunk;
  }
}