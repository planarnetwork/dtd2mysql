import { Readable, Transform } from "stream";
import { GTFSLoader } from "./GTFSLoader";
import * as chai from "chai";
import * as spies from "chai-spies";

chai.use(spies);

describe("GTFSLoader", () => {

  it("pipes data to gtfs-stream", async () => {
    const stream = () => new MockGTFSStream() as any;
    const loader = new GTFSLoader(stream);
    const file = new MockFileStream([{}]);
    const spy = chai.spy.on(file, "pipe");

    await loader.load(file);

    chai.expect(spy).to.have.been.called.exactly(1);
  });

  it("removes calendars before a specified date", async () => {
    const stream = () => new MockGTFSStream() as any;
    const loader = new GTFSLoader(stream);
    const file = new MockFileStream([
      { type: "calendar", data: { monday: 1, end_date: "20190528" } },
      { type: "calendar", data: { monday: 1, end_date: "20190501" } },
    ]);

    const result = await loader.load(file, "", "20190515");

    chai.expect(result.calendars).to.deep.equal([
      { monday: 1, end_date: "20190528" },
    ]);
  });

  it("removes calendar dates before a specified date", async () => {
    const stream = () => new MockGTFSStream() as any;
    const loader = new GTFSLoader(stream);
    const file = new MockFileStream([
      { type: "calendar_date", data: { service_id: 1, date: "20190528" } },
      { type: "calendar_date", data: { service_id: 1, date: "20190501" } },
    ]);

    const result = await loader.load(file, "", "20190515");

    chai.expect(result.calendarDates).to.deep.equal({
      1: [
        { service_id: 1, date: "20190528" },
      ]
    });
  });

  it("prefixes stops", async () => {
    const stream = () => new MockGTFSStream() as any;
    const loader = new GTFSLoader(stream);
    const file = new MockFileStream([
      { type: "stop", data: { stop_id: "A", stop_code: "A", stop_lon: 1, stop_lat: 1 } },
      { type: "stop", data: { stop_id: "B", stop_code: "B", stop_lon: 1, stop_lat: 1 } },
    ]);

    const result = await loader.load(file, "_");

    chai.expect(result.stops).to.deep.equal([
      { stop_id: "_A", stop_code: "A", stop_lon: 1, stop_lat: 1 },
      { stop_id: "_B", stop_code: "B", stop_lon: 1, stop_lat: 1 },
    ]);
  });

  it("prefixes stops in stop_times", async () => {
    const stream = () => new MockGTFSStream() as any;
    const loader = new GTFSLoader(stream);
    const file = new MockFileStream([
      { type: "stop_time", data: { stop_id: "A", departure_time: 1, arrival_time: 1 } },
      { type: "stop_time", data: { stop_id: "B", departure_time: 1, arrival_time: 1 } },
    ]);

    const result = await loader.load(file, "_");

    chai.expect(result.stopTimes).to.deep.equal([
      { stop_id: "_A", departure_time: 1, arrival_time: 1 },
      { stop_id: "_B", departure_time: 1, arrival_time: 1 },
    ]);
  });

});

class MockGTFSStream extends Transform {

  constructor() {
    super({ objectMode: true });
  }

  public _transform(data: any, encoding: string, callback: any): void {
    callback(null, data);
  }

}

class MockFileStream extends Readable {

  constructor(
    private readonly data: any[]
  ) {
    super({ objectMode: true });
  }

  public _read(size: number): void {
    if (this.data.length === 0) {
      this.push(null);
    }
    else {
      this.push(this.data.reverse().pop());
    }
  }

}
