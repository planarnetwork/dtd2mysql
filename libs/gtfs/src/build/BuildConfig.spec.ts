import {describe, it, expect} from "vitest";
import {parseConfig} from "./BuildConfig";

const minimal = {source: "RJTTF918.ZIP"};

describe("parseConfig", () => {

  it("takes a single source without making you write a list", () => {
    expect(parseConfig(minimal).source).to.deep.equal(["RJTTF918.ZIP"]);
    expect(parseConfig({source: ["a.zip", "b.zip"]}).source).to.deep.equal(["a.zip", "b.zip"]);
  });

  it("defaults the things a build can guess", () => {
    const config = parseConfig(minimal);

    expect(config.out).to.equal("gtfs.zip");
    expect(config.links).to.equal(false);
    expect(config.licence).to.equal("permissive");
    expect(config.enrichers).to.deep.equal([]);
    expect(config.extensions).to.deep.equal([]);
  });

  it("insists on a source, since there is nothing to build without one", () => {
    expect(() => parseConfig({})).to.throw(/source must be a list/);
    expect(() => parseConfig({source: []})).to.throw(/at least one feed file/);
  });

  it("names an option it does not recognise, and lists the ones it does", () => {
    // A typo in a config is silent otherwise: the build runs and quietly does
    // not do the thing the option was meant to turn on.
    expect(() => parseConfig({...minimal, sources: ["x"]}))
      .to.throw(/sources is not a config option. Expected one of: source, out/);
  });

  it("rejects a licence tier it cannot honour", () => {
    expect(() => parseConfig({...minimal, licence: "whatever"}))
      .to.throw(/licence must be one of: permissive, full. Got whatever./);
  });

});

describe("parseConfig, enrichers", () => {

  it("fails fast on an enricher it does not know", () => {
    // Left to run, a typo produces a feed quietly missing whatever that source
    // was meant to add - indistinguishable from a source that matched nothing.
    expect(() => parseConfig({...minimal, enrichers: {NAPTAM: null}}, ["NAPTAN"]))
      .to.throw(/NAPTAM is not an enricher this build knows about. Available: NAPTAN./);
  });

  it("says so when nothing at all is registered", () => {
    expect(() => parseConfig({...minimal, enrichers: {NAPTAN: null}}))
      .to.throw(/Available: none are registered./);
  });

  it("reads an enricher with no settings as on with its defaults", () => {
    const [naptan] = parseConfig({...minimal, enrichers: {NAPTAN: null}}, ["NAPTAN"]).enrichers;

    expect(naptan).to.deep.equal({key: "NAPTAN", priority: undefined, apply: undefined, options: {}});
  });

  it("carries the priority override, the allowlist and the options", () => {
    const [naptan] = parseConfig({
      ...minimal,
      enrichers: {NAPTAN: {priority: 80, apply: ["stop_lat", "stop_lon"], options: {path: "./n.xml"}}}
    }, ["NAPTAN"]).enrichers;

    expect(naptan.priority).to.equal(80);
    expect(naptan.apply).to.deep.equal(["stop_lat", "stop_lon"]);
    expect(naptan.options).to.deep.equal({path: "./n.xml"});
  });

  it("names a mistyped enricher option", () => {
    expect(() => parseConfig({...minimal, enrichers: {NAPTAN: {priorty: 80}}}, ["NAPTAN"]))
      .to.throw(/NAPTAN.priorty is not an enricher option/);
  });

  it("insists a priority is a number", () => {
    expect(() => parseConfig({...minimal, enrichers: {NAPTAN: {priority: "high"}}}, ["NAPTAN"]))
      .to.throw(/NAPTAN.priority must be a number. Got "high"./);
  });

  it("orders the enrichers so the config reads the same however it was typed", () => {
    const keys = parseConfig(
      {...minimal, enrichers: {OSM: null, CORPUS: null, NAPTAN: null}},
      ["OSM", "CORPUS", "NAPTAN"]
    ).enrichers.map(e => e.key);

    expect(keys).to.deep.equal(["CORPUS", "NAPTAN", "OSM"]);
  });

});
