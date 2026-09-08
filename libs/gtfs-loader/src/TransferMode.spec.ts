import { describe, it, expect } from "vitest";
import { transferModes } from "./TransferMode.js";

describe("transferModes", () => {

  it("reads a single mode", () => {
    expect(transferModes("TUBE")).to.deep.equal(["TUBE"]);
  });

  it("reads every tag of a compound mode", () => {
    expect(transferModes("TRANSFER|TUBE")).to.deep.equal(["TRANSFER", "TUBE"]);
    expect(transferModes("BUS|WALK")).to.deep.equal(["BUS", "WALK"]);
  });

  it("reads a bare TRANSFER as itself", () => {
    expect(transferModes("TRANSFER")).to.deep.equal(["TRANSFER"]);
  });

  it("gives nothing for a transfer with no mode", () => {
    expect(transferModes(undefined)).to.deep.equal([]);
    expect(transferModes("")).to.deep.equal([]);
    expect(transferModes("|")).to.deep.equal([]);
  });

});
