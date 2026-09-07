import AdmZip from "adm-zip";
import * as fs from "fs";
import * as path from "node:path";

/**
 * A directory of files as a GTFS zip.
 *
 * Flat, and in a fixed order: a GTFS feed is a directory of files at the root of
 * the archive, and the same feed should produce the same zip. Written in process
 * and awaited, so this resolves when the file exists rather than when a timer is
 * due to start writing it, and a failure fails the build instead of being thrown
 * into an empty stack.
 */
export async function writeZip(directory: string, filename: string): Promise<void> {
  if (fs.existsSync(filename)) {
    fs.unlinkSync(filename);
  }

  const zip = new AdmZip();

  for (const file of fs.readdirSync(directory).sort()) {
    zip.addLocalFile(path.join(directory, file));
  }

  await zip.writeZipPromise(filename);
}
