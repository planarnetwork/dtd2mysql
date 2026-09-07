import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { strToU8, zipSync } from "fflate";
import { loadGTFS } from "../src/GTFSLoader.js";
import { normalise } from "../src/Normalise.js";

/**
 * The loader read over a feed this repository actually writes.
 *
 * Every other spec here builds its feed inline, which is right for testing one behaviour at a time
 * and says nothing about whether the whole thing works on a real file. The golden feed belongs to
 * cif2gtfs, which is the only committed example of this project's output; import.spec.ts in
 * dtd2mysql reaches across for it the same way and for the same reason.
 *
 * It is also the only place the two halves meet: cif2gtfs writes the transfer_type 4 rows that
 * LinkedTrips reads back, so a change to either side that broke the round trip would show up here
 * and nowhere else.
 */
const golden = path.join(__dirname, "..", "..", "..", "apps", "cif2gtfs", "fixtures", "mini", "golden");

function goldenZip(): Uint8Array {
  const files: Record<string, Uint8Array> = {};

  for (const file of fs.readdirSync(golden).filter(name => name.endsWith(".txt"))) {
    files[file] = strToU8(fs.readFileSync(path.join(golden, file), "utf8"));
  }

  return zipSync(files);
}

describe("loading the golden feed", () => {

  it("reads the trips, stops and couplings out of it", async () => {
    const feed = await loadGTFS(goldenZip());

    expect(feed.trips.length).to.be.greaterThan(0);
    expect(Object.keys(feed.stops).length).to.be.greaterThan(0);

    // transfers.txt carries in-seat couplings, which is what LinkedTrips is for
    expect(feed.links.length).to.be.greaterThan(0);

    // every trip has calls, and every call has a time that is a number
    for (const trip of feed.trips) {
      expect(trip.stopTimes.length).to.be.greaterThan(0);

      for (const stopTime of trip.stopTimes) {
        expect(Number.isFinite(stopTime.arrivalTime)).to.equal(true);
        expect(Number.isFinite(stopTime.departureTime)).to.equal(true);
      }
    }
  });

  it("normalises into a timetable with the through trips joined on", async () => {
    const feed = await loadGTFS(goldenZip());
    const timetable = normalise(feed);

    // normalise drops what cannot be boarded and adds one trip per coupling, so it ends up with
    // more trips than the feed listed rather than the same ones renamed
    expect(timetable.trips.length).to.be.greaterThan(feed.trips.length);
    expect(timetable.trips.length).to.equal(timetable.calls.length);

    // the feed identifies platforms individually, so every stop resolves to the station it is in
    expect(timetable.stations.size).to.equal(Object.keys(feed.stops).length);
  });

});
