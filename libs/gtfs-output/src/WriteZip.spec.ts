import {describe, it, expect, afterEach} from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {unzipSync, strFromU8} from "fflate";
import {writeZip} from "./WriteZip";

const made: string[] = [];

function scratch(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "writezip"));

  made.push(dir);

  return dir;
}

function feed(files: Record<string, string>): string {
  const dir = path.join(scratch(), "work");

  fs.mkdirSync(dir, {recursive: true});

  for (const [name, contents] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), contents);
  }

  return dir;
}

/** A file of the given size that occupies no disk. */
function sparse(filename: string, size: number): void {
  const fd = fs.openSync(filename, "w");

  fs.ftruncateSync(fd, size);
  fs.closeSync(fd);
}

function read(filename: string): Record<string, string> {
  const entries = unzipSync(fs.readFileSync(filename));
  const text: Record<string, string> = {};

  for (const [name, bytes] of Object.entries(entries)) {
    text[name] = strFromU8(bytes);
  }

  return text;
}

afterEach(() => {
  for (const dir of made.splice(0)) {
    fs.rmSync(dir, {recursive: true, force: true});
  }
});

describe("writeZip", () => {

  it("writes every file in the directory", async () => {
    const dir = feed({"agency.txt": "agency_id\nOP1\n", "stops.txt": "stop_id\n1\n"});
    const output = path.join(scratch(), "feed.zip");

    await writeZip(dir, output);

    expect(read(output)).to.deep.equal({
      "agency.txt": "agency_id\nOP1\n",
      "stops.txt": "stop_id\n1\n"
    });
  });

  it("writes the files in a fixed order", async () => {
    const dir = feed({"stops.txt": "b", "agency.txt": "a", "routes.txt": "c"});
    const output = path.join(scratch(), "feed.zip");

    await writeZip(dir, output);

    expect(Object.keys(read(output))).to.deep.equal(["agency.txt", "routes.txt", "stops.txt"]);
  });

  /**
   * The feed is published as a release asset, and two builds of the same feed
   * being different files is a difference somebody has to explain. The dates the
   * entries carry are the only thing in here that is not the feed itself.
   */
  it("writes the same bytes for the same feed", async () => {
    const first = path.join(scratch(), "first.zip");
    const second = path.join(scratch(), "second.zip");

    await writeZip(feed({"agency.txt": "agency_id\nOP1\n"}), first);
    await writeZip(feed({"agency.txt": "agency_id\nOP1\n"}), second);

    expect(fs.readFileSync(first)).to.deep.equal(fs.readFileSync(second));
  });

  it("replaces an archive that is already there", async () => {
    const output = path.join(scratch(), "feed.zip");

    await writeZip(feed({"agency.txt": "first"}), output);
    await writeZip(feed({"agency.txt": "second"}), output);

    expect(read(output)["agency.txt"]).to.equal("second");
  });

  it("survives a file larger than the stream's buffer", async () => {
    const dir = feed({"stop_times.txt": "x".repeat(96 * 1024 * 1024)});
    const output = path.join(scratch(), "feed.zip");

    await writeZip(dir, output);

    expect(read(output)["stop_times.txt"].length).to.equal(96 * 1024 * 1024);
  });

  /**
   * The whole reason this writer exists. A header that leaves its sizes out
   * forces a reader going forwards to scan the compressed bytes for the next
   * signature, and compressed bytes eventually contain one - which truncated a
   * merged national feed at 2.25GB of 2.96GB.
   */
  it("declares each entry's sizes in its own header", async () => {
    // agency.txt sorts first, so it is the entry the first header describes.
    const agency = "agency_id\nOP1\n";
    const dir = feed({"agency.txt": agency, "stops.txt": "stop_id\n1\n"});
    const output = path.join(scratch(), "feed.zip");

    await writeZip(dir, output);

    const bytes = fs.readFileSync(output);
    const flag = bytes.readUInt16LE(6);

    // Bit 3 is the one that says "the sizes are in a descriptor after the data".
    expect(flag & 8).to.equal(0);
    expect(bytes.readUInt32LE(18)).to.be.greaterThan(0);   // compressed
    expect(bytes.readUInt32LE(22)).to.equal(agency.length);  // uncompressed
    expect(bytes.readUInt32LE(14)).to.not.equal(0);        // crc32
  });

  /**
   * A reader that trusts the header reads exactly the bytes the header promised,
   * so the promise has to be true for data that is not one small chunk.
   */
  it("declares the sizes correctly for an entry of many chunks", async () => {
    const contents = "x".repeat(96 * 1024 * 1024);
    const dir = feed({"stop_times.txt": contents});
    const output = path.join(scratch(), "feed.zip");

    await writeZip(dir, output);

    const bytes = fs.readFileSync(output);
    const name = bytes.readUInt16LE(26);
    const compressed = bytes.readUInt32LE(18);
    const from = 30 + name;

    expect(bytes.readUInt32LE(22)).to.equal(contents.length);
    // The next thing in the file is the central directory, not a descriptor.
    expect(bytes.readUInt32LE(from + compressed)).to.equal(0x02014b50);
  });

  /**
   * A zip records a size in four bytes, so an entry over 4GB produces an archive
   * that is wrong rather than one that fails.
   *
   * The fixture is a sparse file: four gigabytes of size, no blocks, made in the
   * time it takes to call ftruncate. The guard reads the size and never the
   * bytes, which is the point of checking the size first.
   */
  it("refuses an entry too large for a zip to describe", async () => {
    const dir = feed({});
    const output = path.join(scratch(), "feed.zip");

    sparse(path.join(dir, "stop_times.txt"), 0x100000000);

    await expect(writeZip(dir, output)).rejects.toThrow(/stop_times.txt is 4294967296 bytes/);
  });

  it("leaves the archive that is there when an entry is too large", async () => {
    const output = path.join(scratch(), "feed.zip");

    await writeZip(feed({"agency.txt": "the feed that works"}), output);

    const dir = feed({"agency.txt": "the feed that does not"});

    sparse(path.join(dir, "stop_times.txt"), 0x100000000);

    await expect(writeZip(dir, output)).rejects.toThrow();

    expect(read(output)["agency.txt"]).to.equal("the feed that works");
  });

});
