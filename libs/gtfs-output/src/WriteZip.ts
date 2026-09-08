import * as fs from "fs";
import * as path from "node:path";
import {once} from "node:events";
import {Zip, ZipDeflate} from "fflate";

/**
 * The largest entry the archive can describe.
 *
 * A zip declares each entry's size in four bytes, and fflate writes those four
 * bytes without checking what it was given: a larger file has its size written
 * modulo 2^32 and the archive is silently wrong. The alternative is zip64, which
 * fflate does not write.
 *
 * A merged GB feed's stop_times.txt is around 3GB, so this is a limit the feed
 * is approaching rather than one it will never reach. It is checked, and the
 * build fails, because a zip that says it holds 700MB of stop times and holds
 * 5GB is worse than no zip at all.
 */
const MAX_ENTRY_SIZE = 0xFFFFFFFF;

/**
 * The timestamp every entry is written with.
 *
 * A zip entry carries the modification time of the file it came from, and the
 * files a feed is built from are written afresh by every build - so the same
 * feed produced two zips that differed, in the sixteen bytes holding the dates.
 * Fixed, they are the same archive. The date itself is arbitrary; it only has to
 * be inside the range a zip can hold, which begins in 1980.
 */
const MTIME = Date.UTC(1980, 0, 2);

/** How much may sit in the output stream's buffer before the read pauses. */
const HIGH_WATER_MARK = 64 * 1024 * 1024;

/**
 * A directory of files as a GTFS zip.
 *
 * Flat, and in a fixed order: a GTFS feed is a directory of files at the root of
 * the archive, and the same feed should produce the same zip. Written in process
 * and awaited, so this resolves when the file exists rather than when a timer is
 * due to start writing it, and a failure fails the build instead of being thrown
 * into an empty stack.
 *
 * Streamed a file at a time rather than assembled in memory. adm-zip, which this
 * used, held the whole archive and refused any entry over 2GB - which a feed
 * with bus stop times in it exceeds.
 */
export async function writeZip(directory: string, filename: string): Promise<void> {
  const files = fs.readdirSync(directory).sort();

  // Before anything is written, so an entry that cannot be described leaves the
  // previous archive where it is rather than half replacing it.
  for (const file of files) {
    const {size} = fs.statSync(path.join(directory, file));

    if (size > MAX_ENTRY_SIZE) {
      throw new Error(
        `${file} is ${size} bytes, and a zip entry may be at most ${MAX_ENTRY_SIZE}. `
        + "Writing it would produce an archive that decompresses to the wrong thing."
      );
    }
  }

  if (fs.existsSync(filename)) {
    fs.unlinkSync(filename);
  }

  const out = fs.createWriteStream(filename);
  const zip = new Zip();

  const written = new Promise<void>((resolve, reject) => {
    zip.ondata = (err, chunk, final) => {
      if (err) {
        reject(err);

        return;
      }

      out.write(chunk);

      if (final) {
        out.end();
      }
    };

    out.on("error", reject);
    out.on("finish", resolve);
  });

  try {
    for (const file of files) {
      const entry = new ZipDeflate(file);

      // Before it is added: adding an entry writes its header, and the header is
      // where the date goes.
      entry.mtime = MTIME;

      zip.add(entry);

      for await (const chunk of fs.createReadStream(path.join(directory, file))) {
        entry.push(chunk, false);

        // fflate hands each compressed chunk straight to `ondata`, which cannot
        // wait, so the backpressure has to be applied to the file being read
        // instead of to the archive being written.
        if (out.writableLength > HIGH_WATER_MARK) {
          await once(out, "drain");
        }
      }

      entry.push(new Uint8Array(0), true);
    }

    zip.end();

    await written;
  }
  catch (err) {
    out.destroy();
    fs.rmSync(filename, {force: true});

    throw err;
  }
}
