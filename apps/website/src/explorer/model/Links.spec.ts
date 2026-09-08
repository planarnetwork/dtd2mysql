import {describe, it, expect} from "vitest";
import {Links} from "./Links.js";
import {openFeed} from "./OpenFeed.js";
import {goldenFeed} from "../test/golden.js";

const feed = goldenFeed();

async function links() {
  const index = await openFeed("golden.zip", feed);

  return new Links(index.files.get("transfers.txt"));
}

describe("Links", () => {

  it("finds the splits and joins the fixture carries", async () => {
    expect((await links()).size).to.equal(56);
  });

  it("follows a coupling from the base trip to the portion and back again", async () => {
    const index = await openFeed("golden.zip", feed);
    const found = new Links(index.files.get("transfers.txt"));
    const transfers = index.files.get("transfers.txt");

    // The first type 4 row in the fixture, whichever it is, has to be followable both ways.
    let row = 0;

    while (Number(transfers?.value("transfer_type", row)) !== 4) {
      row++;
    }

    const from = transfers?.value("from_trip_id", row) as string;
    const to = transfers?.value("to_trip_id", row) as string;

    expect(found.onwardOf(from).map(link => link.toTripId)).to.contain(to);
    expect(found.priorTo(to).map(link => link.fromTripId)).to.contain(from);
    expect(found.of(from).length).to.be.greaterThan(0);
    expect(found.of(to).length).to.be.greaterThan(0);
  });

  it("carries the platforms the coupling happens at", async () => {
    const index = await openFeed("golden.zip", feed);
    const found = new Links(index.files.get("transfers.txt"));
    const link = found.of("C04558_20260518_20261207")[0];

    expect(link).to.not.equal(undefined);
    expect(link.fromStopId).to.equal("9100CRSTRS2");
    expect(link.toStopId).to.equal("9100CRSTRS2");
  });

  it("has nothing for a trip in no coupling", async () => {
    const found = await links();

    expect(found.onwardOf("nothing couples to this")).to.deep.equal([]);
    expect(found.priorTo("nothing couples to this")).to.deep.equal([]);
  });

  it("ignores a type 4 row that names no trips", async () => {
    // It names no coupling. The Integrity check is what reports it as wrong.
    const {zipSync} = await import("fflate");
    const index = await openFeed("odd.zip", zipSync({
      "stops.txt": new TextEncoder().encode("stop_id\nS1\n"),
      "transfers.txt": new TextEncoder().encode(
        "from_stop_id,to_stop_id,from_trip_id,to_trip_id,transfer_type\nS1,S1,,,4\n")
    }));

    expect(new Links(index.files.get("transfers.txt")).size).to.equal(0);
  });

  it("ignores the interchange rows, which are not couplings", async () => {
    const index = await openFeed("golden.zip", feed);
    const transfers = index.files.get("transfers.txt");

    let type2 = 0;

    for (let row = 0; row < (transfers?.rows ?? 0); row++) {
      if (Number(transfers?.value("transfer_type", row)) === 2) {
        type2++;
      }
    }

    expect(type2).to.be.greaterThan(0);
    expect(new Links(transfers).size).to.equal(56); // the type 4s only
  });

});
