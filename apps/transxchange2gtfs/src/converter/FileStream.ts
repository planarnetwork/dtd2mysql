import {Transform, TransformCallback} from "stream";
import {promisify} from "util";
import * as fs from "fs";
import {parse} from "path";
import {Converter} from "./Converter";

const readFile = promisify(fs.readFile);
const exec = promisify(require("child_process").exec);
const glob = promisify(require("glob"));

/**
 * Reads a set of XML or zip files and emits the contents downstream
 */
export class FileStream extends Transform {
  private zipIndex = 0;

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
      await this.readZip(file);
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

  private async readZip(file: string): Promise<any> {
    const outputDir = Converter.TMP + this.zipIndex++ + "/";

    await exec("unzip -u " + file + " -d " + outputDir);

    const files: string[] = await glob(outputDir + "**/*.xml");

    for (const f of files) {
      await this.readFile(f);
    }
  }

}
