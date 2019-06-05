import * as chai from "chai";
import { GTFSOutputFactory } from "./GTFSOutputFactory";
import { CalendarFactory } from "./calendar/CalendarFactory";
import * as cheapRuler from "cheap-ruler";
import { RouteTypeIndex } from "./merger/RouteMerger";
import * as fs from "fs";
import { GTFSOutput } from "./GTFSOutput";

describe("GTFSOutputFactory", () => {
  const tmpDir = "./tmp";

  const factory = new GTFSOutputFactory(
    new CalendarFactory(),
    tmpDir,
    cheapRuler(46),
    1,
    {} as RouteTypeIndex
  );

  it("creates the output directory", () => {
    factory.create();

    chai.expect(fs.existsSync(tmpDir)).to.equal(true);
  });

  it("creates a GTFSOutput object", () => {
    const output = factory.create();

    chai.expect(output instanceof GTFSOutput).to.equal(true);
  });
});
