import AdmZip from "adm-zip";
import {Transform, TransformCallback} from "stream";
import * as fs from "node:fs";
import {parse} from "node:path";

/**
 * Reads a set of XML or zip files and emits the contents downstream.
 *
 * A BODS download is a zip of zips of XML, so a zip entry that is itself a zip is
 * opened in turn. adm-zip rather than yauzl, because it is the one zip library
 * the rest of this repository uses and it reads a nested archive from the buffer
 * it already has. It reads the whole archive into memory, where yauzl streamed
 * entry by entry - the documents are handed on one at a time either way, so what
 * this costs is the archive itself.
 */
export class FileStream extends Transform {

  constructor() {
    super({objectMode: true});
  }

  /**
   * Pop the next file off the list and emit it. If we've got no more files, close the stream
   */
  public async _transform(file: string, encoding: string, callback: TransformCallback): Promise<void> {
    const extension = parse(file).ext.toLowerCase();

    if (extension === ".xml") {
      console.log("Processing " + file);
      this.push(fs.readFileSync(file, "utf8"));
    }
    else if (extension === ".zip") {
      console.log("Processing zip " + file);
      this.readZip(new AdmZip(file));
    }
    else {
      this.destroy(Error("Unknown file type: " + file));
    }

    callback();
  }

  private readZip(zip: AdmZip): void {
    for (const entry of zip.getEntries()) {
      const name = entry.entryName.toLowerCase();

      if (entry.isDirectory) {
        continue;
      }

      if (name.endsWith(".xml")) {
        console.log("Processing " + entry.entryName);
        this.push(entry.getData().toString("utf8"));
      }
      else if (name.endsWith(".zip")) {
        console.log("Processing " + entry.entryName);
        this.readZip(new AdmZip(entry.getData()));
      }
      else {
        console.log("Skipping " + entry.entryName);
      }
    }
  }

}
