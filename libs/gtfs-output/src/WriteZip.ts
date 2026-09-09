import * as fs from "fs";
import * as path from "node:path";
import * as zlib from "node:zlib";
import {Writable} from "node:stream";
import {pipeline} from "node:stream/promises";

/**
 * The largest entry this can describe, and the largest archive.
 *
 * A zip records sizes and offsets in four bytes each. Past that it needs zip64,
 * which this does not write - so both are checked, and a feed too large to
 * describe fails the build rather than producing an archive that says one thing
 * and holds another.
 *
 * A merged GB feed's stop_times.txt is around 3GB, so this is a limit the feed
 * is approaching rather than one it will never reach.
 */
const MAX_SIZE = 0xFFFFFFFF;

/**
 * 1980-01-02, in the two-byte date DOS gave the zip format: the year from 1980
 * in the top seven bits, then the month, then the day.
 *
 * A zip entry carries the modification time of the file it came from, and the
 * files a feed is built from are written afresh by every build - so the same
 * feed produced two archives that differed, in the bytes holding the dates.
 * Fixed, they are the same archive. The date is arbitrary; it only has to be
 * inside the range a zip can hold, which begins in 1980.
 */
const DOS_DATE = (1 << 5) | 2;
const DOS_TIME = 0;

const LOCAL_HEADER = 30;
const CENTRAL_RECORD = 46;
const END_RECORD = 22;

/** Where the sizes live in a local header, and how many bytes they take. */
const SIZES_AT = 14;
const SIZES_LENGTH = 12;

interface Entry {
  name: Buffer;
  offset: number;
  crc: number;
  compressed: number;
  uncompressed: number;
}

/**
 * A directory of files as a GTFS zip.
 *
 * Flat, and in a fixed order: a GTFS feed is a directory of files at the root of
 * the archive, and the same feed produces the same zip.
 *
 * **Every entry declares its size in its own header**, which is the whole reason
 * this is written here rather than handed to a library. A zip header comes
 * before the data it describes, and the compressed size is not known until the
 * data has been compressed, so a writer streaming into something it cannot seek
 * - a pipe, a socket - has to leave the sizes out and put them in a descriptor
 * after the data instead. Every streaming zip library therefore does, fflate and
 * yazl included.
 *
 * That pushes the cost onto whoever reads it. A reader going forwards has no
 * idea where an entry ends, so it scans the compressed bytes looking for the
 * next header's signature - and compressed bytes are effectively random, so
 * eventually they contain one. A merged national feed hit exactly that: 684MB of
 * compressed stop times containing `PK\x03\x04` 515MB in, which truncated the
 * file at 2.25GB of 2.96GB for every reader that does not consult the central
 * directory. The chance rises with the size of the feed.
 *
 * This writes to a file, which can be seeked, so it does not have to guess: the
 * header is written with room for the sizes, the entry is streamed through, and
 * the twelve bytes are put back where they belong. No descriptor, nothing to
 * scan for.
 */
export async function writeZip(directory: string, filename: string): Promise<void> {
  const files = fs.readdirSync(directory).sort();

  // Before anything is written, so an entry that cannot be described leaves the
  // previous archive where it is rather than half replacing it.
  for (const file of files) {
    const {size} = fs.statSync(path.join(directory, file));

    if (size > MAX_SIZE) {
      throw new Error(
        `${file} is ${size} bytes, and a zip entry may be at most ${MAX_SIZE}. `
        + "Writing it would produce an archive that decompresses to the wrong thing."
      );
    }
  }

  if (fs.existsSync(filename)) {
    fs.unlinkSync(filename);
  }

  const out = await fs.promises.open(filename, "w");

  try {
    const entries: Entry[] = [];
    let at = 0;

    const write = async (buffer: Buffer): Promise<void> => {
      await out.write(buffer, 0, buffer.length, at);
      at += buffer.length;
    };

    for (const file of files) {
      const name = Buffer.from(file, "utf8");
      const offset = at;

      await write(localHeader(name));
      await write(name);

      const start = at;
      let crc = 0;
      let uncompressed = 0;

      const source = fs.createReadStream(path.join(directory, file));

      // Over the bytes going in, as they go in. Nothing is read twice and
      // nothing is held: node has had a crc32 since 20.15.
      source.on("data", chunk => {
        crc = zlib.crc32(chunk as Buffer, crc);
        uncompressed += chunk.length;
      });

      await pipeline(source, zlib.createDeflateRaw({level: 6}), new Writable({
        highWaterMark: 4 * 1024 * 1024,
        write(chunk: Buffer, _encoding, done) {
          out.write(chunk, 0, chunk.length, at).then(
            () => { at += chunk.length; done(); },
            done
          );
        }
      }));

      const compressed = at - start;

      await out.write(sizes(crc, compressed, uncompressed), 0, SIZES_LENGTH, offset + SIZES_AT);

      entries.push({name, offset, crc, compressed, uncompressed});
    }

    const directoryAt = at;

    for (const entry of entries) {
      await write(centralRecord(entry));
      await write(entry.name);
    }

    // An offset is four bytes too, so an archive this large cannot say where its
    // own entries are.
    if (directoryAt > MAX_SIZE) {
      throw new Error(
        `The feed compresses to ${directoryAt} bytes, and a zip may address at most ${MAX_SIZE}.`
      );
    }

    await write(endRecord(entries.length, at - directoryAt, directoryAt));
    await out.close();
  }
  catch (err) {
    await out.close().catch(() => undefined);
    fs.rmSync(filename, {force: true});

    throw err;
  }
}

/**
 * The header before an entry's data, with the sizes left as zero for now and the
 * flag that would disclaim them left unset - they are written once the entry has
 * been compressed and their real values are known.
 */
function localHeader(name: Buffer): Buffer {
  const header = Buffer.alloc(LOCAL_HEADER);

  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);           // the version that can extract it
  header.writeUInt16LE(0, 6);            // no flags, and no data descriptor
  header.writeUInt16LE(8, 8);            // deflate
  header.writeUInt16LE(DOS_TIME, 10);
  header.writeUInt16LE(DOS_DATE, 12);
  header.writeUInt16LE(name.length, 26);

  return header;
}

function sizes(crc: number, compressed: number, uncompressed: number): Buffer {
  const buffer = Buffer.alloc(SIZES_LENGTH);

  buffer.writeUInt32LE(crc, 0);
  buffer.writeUInt32LE(compressed, 4);
  buffer.writeUInt32LE(uncompressed, 8);

  return buffer;
}

function centralRecord(entry: Entry): Buffer {
  const record = Buffer.alloc(CENTRAL_RECORD);

  record.writeUInt32LE(0x02014b50, 0);
  record.writeUInt16LE(20, 4);           // the version that wrote it
  record.writeUInt16LE(20, 6);           // and the one that can extract it
  record.writeUInt16LE(0, 8);
  record.writeUInt16LE(8, 10);
  record.writeUInt16LE(DOS_TIME, 12);
  record.writeUInt16LE(DOS_DATE, 14);
  record.writeUInt32LE(entry.crc, 16);
  record.writeUInt32LE(entry.compressed, 20);
  record.writeUInt32LE(entry.uncompressed, 24);
  record.writeUInt16LE(entry.name.length, 28);
  record.writeUInt32LE(entry.offset, 42);

  return record;
}

function endRecord(count: number, length: number, offset: number): Buffer {
  const record = Buffer.alloc(END_RECORD);

  record.writeUInt32LE(0x06054b50, 0);
  record.writeUInt16LE(count, 8);
  record.writeUInt16LE(count, 10);
  record.writeUInt32LE(length, 12);
  record.writeUInt32LE(offset, 16);

  return record;
}
