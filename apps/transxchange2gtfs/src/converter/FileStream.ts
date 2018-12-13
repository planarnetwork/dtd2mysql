import {Transform, TransformCallback} from "stream";
import {promisify} from "util";
import * as fs from "fs";
import {parse} from "path";
import {Container} from "../Container";

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
  public async _transform(file: string, encoding: string, callback: TransformCallback): Promise<void> {
    const extension = parse(file).ext.toLowerCase();

    console.log("Processing " + file);

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
    const outputDir = Container.TMP + this.zipIndex++ + "/";

    await exec("unzip -uo " + file + " -d " + outputDir, { maxBuffer: Number.MAX_SAFE_INTEGER });

    const files: string[] = await glob(outputDir + "**/*.xml");

    for (const f of files) {
      await this.readFile(f);
    }
  }

}
