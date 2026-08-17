import AdmZip from "adm-zip";
import byline from "byline";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {finished} from "node:stream/promises";

/**
 * A DTD feed zip, read one file at a time.
 *
 * Entries are extracted to a temporary directory instead of being decompressed
 * into memory: the MCA in a full refresh is 650 MB and seven million lines, and
 * holding either the buffer or the split array costs more than the build it is
 * feeding.
 */
export class FeedZip {

  private readonly zip: AdmZip;
  private readonly directory: string;

  constructor(private readonly filename: string) {
    this.zip = new AdmZip(filename);
    this.directory = fs.mkdtempSync(path.join(os.tmpdir(), "cif"));
  }

  /**
   * The extensions this zip contains, upper case and without the dot.
   */
  public get extensions(): string[] {
    return this.zip.getEntries().map(entry => path.extname(entry.entryName).slice(1).toUpperCase());
  }

  /**
   * Call back with every line of the given file, skipping the blank lines and
   * the `/!!` comments the importer also skips.
   */
  public async eachLine(extension: string, onLine: (line: string) => void): Promise<void> {
    const entry = this.zip.getEntries()
      .find(e => path.extname(e.entryName).slice(1).toUpperCase() === extension);

    if (!entry) {
      return;
    }

    this.zip.extractEntryTo(entry, this.directory, false, true);

    const extracted = path.join(this.directory, path.basename(entry.entryName));
    const lines = byline.createStream(fs.createReadStream(extracted, "utf8"));

    let number = 0;

    lines.on("data", (line: string) => {
      number++;

      if (line === "" || line.charAt(0) === "/") {
        return;
      }

      try {
        onLine(line);
      }
      catch (err) {
        // Seven million lines in, "non-nullable field received null value" is
        // only useful with the line it came from attached.
        throw new Error(
          `${path.basename(entry.entryName)} line ${number}: ${err instanceof Error ? err.message : err}\n  ${line}`,
          {cause: err}
        );
      }
    });

    try {
      await finished(lines);
    }
    finally {
      fs.rmSync(extracted, {force: true});
    }
  }

  public close(): void {
    fs.rmSync(this.directory, {recursive: true, force: true});
  }

}
