import {describe, it, expect} from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {writeMarkers} from "./dual-package-markers.mjs";

/**
 * The marker is what tells node that dist/esm is ESM, and without it the ESM build of a dual
 * package is loaded as CommonJS - where `export` is a syntax error and, worse, the declarations
 * are read in the wrong mode and report nothing. Nothing else in the build would notice, because
 * both formats come out of the same source and the tests run against source.
 */
function libs(...names) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "markers-"));

  for (const name of names) {
    fs.mkdirSync(path.join(root, name, "dist", "esm"), {recursive: true});
  }

  return root;
}

describe("writeMarkers", () => {

  it("marks the esm output of every library that has one", () => {
    const root = libs("gtfs-schema", "gtfs-loader");

    expect(writeMarkers(root)).to.deep.equal(["gtfs-loader", "gtfs-schema"]);

    for (const lib of ["gtfs-schema", "gtfs-loader"]) {
      const marker = JSON.parse(fs.readFileSync(path.join(root, lib, "dist", "esm", "package.json"), "utf8"));

      expect(marker).to.deep.equal({type: "module"});
    }
  });

  it("leaves a library that builds only CommonJS alone", () => {
    const root = libs("gtfs-loader");

    fs.mkdirSync(path.join(root, "gtfs", "dist"), {recursive: true});

    expect(writeMarkers(root)).to.deep.equal(["gtfs-loader"]);
    expect(fs.existsSync(path.join(root, "gtfs", "dist", "package.json"))).to.equal(false);
  });

  it("does nothing before anything has been built", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "markers-"));

    fs.mkdirSync(path.join(root, "gtfs-loader"));

    expect(writeMarkers(root)).to.deep.equal([]);
  });

});
