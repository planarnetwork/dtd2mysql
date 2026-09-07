import {describe, it, expect} from "vitest";
import {Writable} from "stream";
import {CSVRowWriter, field} from "./CSVRowWriter";

/**
 * Collects what was written as one string.
 */
function sink(): [Writable, () => string] {
  let text = "";

  const out = new Writable({
    write(chunk, _encoding, done) {
      text += chunk.toString();
      done();
    }
  });

  return [out, () => text];
}

describe("CSVRowWriter", () => {

  it("writes the header on construction, before any row", () => {
    const [out, text] = sink();

    new CSVRowWriter(["a", "b"] as const, out);

    expect(text()).to.equal("a,b\n");
  });

  it("gives a file with no rows a header", () => {
    const [out, text] = sink();
    const writer = new CSVRowWriter(["stop_id", "stop_name"] as const, out);

    writer.end();

    // csv-write-stream wrote the header from inside its transform, so a stream
    // that received no rows produced a completely empty file.
    expect(text()).to.equal("stop_id,stop_name\n");
  });

  it("writes the declared columns, in the declared order", () => {
    const [out, text] = sink();
    const writer = new CSVRowWriter(["b", "a"] as const, out);

    writer.write({a: 1, b: 2});

    expect(text()).to.equal("b,a\n2,1\n");
  });

  it("ignores a field the columns do not name", () => {
    const [out, text] = sink();
    const writer = new CSVRowWriter(["a"] as const, out);

    // The reason one row type can serve two producers: a bus feed's transfers
    // declare four columns of a row that has eighteen.
    writer.write({a: 1, b: 2} as {a: number});

    expect(text()).to.equal("a\n1\n");
  });

  it("writes an empty field for a column the row has no value for", () => {
    const [out, text] = sink();
    const writer = new CSVRowWriter(["a", "b"] as const, out);

    writer.write({a: 1} as {a: number, b: number});

    expect(text()).to.equal("a,b\n1,\n");
  });

});

describe("field", () => {

  it("writes null and undefined as empty", () => {
    expect(field(null)).to.equal("");
    expect(field(undefined)).to.equal("");
  });

  it("leaves a plain value alone", () => {
    expect(field("CLJ")).to.equal("CLJ");
    expect(field(0)).to.equal("0");
    expect(field(51.5074)).to.equal("51.5074");
  });

  it("quotes a value containing a comma", () => {
    // The rail feed's multi-destination headsigns are why this matters.
    expect(field("Inverness, Aberdeen and Fort William"))
      .to.equal("\"Inverness, Aberdeen and Fort William\"");
  });

  it("quotes a value containing a quote, and doubles the quote", () => {
    expect(field("The \"Bull\" Inn")).to.equal("\"The \"\"Bull\"\" Inn\"");
  });

  it("quotes a value containing a newline", () => {
    expect(field("two\nlines")).to.equal("\"two\nlines\"");
    expect(field("two\r\nlines")).to.equal("\"two\r\nlines\"");
  });

  it("does not quote a value that needs no quoting", () => {
    expect(field("no quoting needed")).to.equal("no quoting needed");
  });

  // Neither of these occurs in any feed this repository builds, so the goldens
  // say nothing about them. csv-write-stream tested the same /[,\r\n"]/ and
  // string-concatenated everything else, and this is where that is written down
  // rather than assumed.
  it("quotes a value containing a bare carriage return", () => {
    expect(field("two\rparts")).to.equal("\"two\rparts\"");
  });

  it("stringifies a value that is not a primitive, as the writer it replaced did", () => {
    expect(field({})).to.equal("[object Object]");
    expect(field([1, 2])).to.equal("\"1,2\"");
    expect(field(true)).to.equal("true");
  });

});
