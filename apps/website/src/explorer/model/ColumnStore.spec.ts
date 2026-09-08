import {describe, it, expect} from "vitest";
import {ColumnStore, columnStoreSink, splitHeader} from "./ColumnStore.js";

/** Feed the text to a sink the way readZip would, in the chunks given. */
function read(chunks: string[]): ColumnStore {
  let store: ColumnStore | undefined;
  const sink = columnStoreSink(built => store = built);

  chunks.forEach((chunk, index) => sink(chunk, index === chunks.length - 1));

  return store as ColumnStore;
}

describe("splitHeader", () => {

  it("splits a plain header", () => {
    expect(splitHeader("stop_id,stop_name,stop_lat")).to.deep.equal(["stop_id", "stop_name", "stop_lat"]);
  });

  it("keeps a carriage return out of the last column name", () => {
    expect(splitHeader("stop_id,stop_name\r")).to.deep.equal(["stop_id", "stop_name"]);
  });

  it("reads a quoted column name", () => {
    expect(splitHeader("stop_id,\"a, name\",stop_lat")).to.deep.equal(["stop_id", "a, name", "stop_lat"]);
  });

  it("strips a byte order mark", () => {
    expect(splitHeader("﻿stop_id,stop_name")).to.deep.equal(["stop_id", "stop_name"]);
  });

});

describe("ColumnStore", () => {

  it("holds a column the schema has never heard of", () => {
    // The explorer is pointed at feeds this repository did not write. Deciding a column is not worth
    // keeping is the one thing a tool for looking at a feed must not do.
    const store = read(["stop_id,stop_name,wibble\n910GMNCRPIC,Manchester Piccadilly,42\n"]);

    expect(store.header).to.deep.equal(["stop_id", "stop_name", "wibble"]);
    expect(store.value("wibble", 0)).to.equal("42");
  });

  it("leaves a column the file does not have absent rather than empty", () => {
    const store = read(["stop_id,stop_name\n910GMNCRPIC,Manchester Piccadilly\n"]);

    expect(store.value("platform_code", 0)).to.equal(undefined);
    expect(store.row(0)).to.deep.equal({stop_id: "910GMNCRPIC", stop_name: "Manchester Piccadilly"});
  });

  it("distinguishes an empty value from an absent column", () => {
    const store = read(["stop_id,platform_code\n910GMNCRPIC,\n"]);

    expect(store.value("platform_code", 0)).to.equal(undefined);
    expect(store.header).to.contain("platform_code");
  });

  it("reads a header split across two chunks", () => {
    const store = read(["stop_id,sto", "p_name\n910GMNCRPIC,Manchester Piccadilly\n"]);

    expect(store.header).to.deep.equal(["stop_id", "stop_name"]);
    expect(store.value("stop_name", 0)).to.equal("Manchester Piccadilly");
  });

  it("reads a row split across two chunks", () => {
    const store = read(["stop_id,stop_name\n910GMNCRPIC,Manch", "ester Piccadilly\n"]);

    expect(store.rows).to.equal(1);
    expect(store.value("stop_name", 0)).to.equal("Manchester Piccadilly");
  });

  it("keeps every row distinct as it grows past its capacity", () => {
    // The row object the parser hands over is reused between rows. A store that kept a reference to
    // it rather than interning the fields would end up with one value repeated a thousand times.
    const rows = Array.from({length: 1000}, (_, i) => `stop-${i},Station ${i}`).join("\n");
    const store = read([`stop_id,stop_name\n${rows}\n`]);

    expect(store.rows).to.equal(1000);
    expect(store.value("stop_id", 0)).to.equal("stop-0");
    expect(store.value("stop_id", 999)).to.equal("stop-999");
    expect(store.value("stop_name", 500)).to.equal("Station 500");
  });

  it("indexes rows by the value of a column", () => {
    const store = read([
      "stop_id,parent_station\n",
      "910GMNCRPIC1,910GMNCRPIC\n910GMNCRPIC2,910GMNCRPIC\n910GLDS1,910GLDS\n"
    ]);

    expect(store.index("parent_station").get("910GMNCRPIC")).to.deep.equal([0, 1]);
    expect(store.index("parent_station").get("910GLDS")).to.deep.equal([2]);
  });

  it("indexes nothing for a column the file does not have", () => {
    const store = read(["stop_id\n910GMNCRPIC\n"]);

    expect(store.index("parent_station").size).to.equal(0);
  });

});
