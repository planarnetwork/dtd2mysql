import * as chai from "chai";
import {CSVStream} from "./CSVStream";
import { Writable } from "stream";

describe("CSVStream", () => {

  it("sends the header first", () => {
    const mock = new MockStream();
    const stream = new CSVStream(["field1", "field2"]);
    stream.pipe(mock);
    const expected = "field1,field2\na,b\n";

    stream.write({ field1: "a", field2: "b" });

    chai.expect(mock.data).to.deep.equal(expected);
  });

  it("does not send duplicate items", () => {
    const mock = new MockStream();
    const stream = new CSVStream(["field1", "field2"], "field1");
    stream.pipe(mock);
    const expected = "field1,field2\na,b\nb,c\n";

    stream.write({ field1: "a", field2: "b" });
    stream.write({ field1: "a", field2: "c" });
    stream.write({ field1: "b", field2: "c" });

    chai.expect(mock.data).to.deep.equal(expected);
  });

});

class MockStream extends Writable {
  public data = "";

  public _write(chunk: any, encoding: string, callback: any) {
    this.data += chunk;

    callback();
  }

}
