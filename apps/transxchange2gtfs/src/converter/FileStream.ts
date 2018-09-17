import {Transform, TransformCallback} from "stream";
import {promisify} from "util";
import * as fs from "fs";
import * as AdmZip from "adm-zip";
import {parse} from "path";

const readFile = promisify(fs.readFile);

/**
 * Reads a set of XML or zip files and emits the contents downstream
 */
export class FileStream extends Transform {

  constructor() {
    super({ objectMode: true });
  }

  /**
   * Pop the next file off the list and emit it. If we've got no more files, close the stream
   */
  async _transform(file: string, encoding: string, callback: TransformCallback): Promise<void> {
    const extension = parse(file).ext.toLowerCase();

    if (extension  === ".xml") {
      await this.readFile(file);
    }
    else if (extension  === ".zip") {
      this.readZip(file);
    }
    else {
      this.destroy(Error("Unknown file type: " + file));
    }

    callback();
  }

  private async readFile(file: string): Promise<void> {
    const contents = await readFile(file, "utf8");

    this.push(contents);
  }

  private readZip(file: string): void {
    const zip = new AdmZip(file);

    for (const entry of zip.getEntries()) {
      const extension = parse(entry.entryName).ext;

      if (extension === ".xml") {
        this.push(entry.getData().toString("utf8"));
      }
    }
  }

}
