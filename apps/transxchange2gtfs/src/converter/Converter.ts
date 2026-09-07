import {FeedRow, RowWriter} from "@gb-transit/gtfs-schema";
import {FileOutput, writeZip} from "@gb-transit/gtfs-output";
import {FileStream, RowStream} from "@gb-transit/txc-source";
import * as fs from "fs";
import * as path from "node:path";
import {Readable} from "stream";

/**
 * Runs the pipeline and writes what comes out of it.
 *
 * Each stream declares the file it writes and the columns of it, so the writer
 * is opened from the stream rather than from a filename passed alongside it -
 * which is what used to let a stream's header and its rows disagree.
 */
export class Converter {

  constructor(
    private readonly inputStream: FileStream,
    private readonly gtfsFiles: readonly RowStream<any, any>[],
    private readonly directory: string
  ) {}

  public async process(input: string[], output: string | undefined): Promise<void> {
    if (input.length === 0 || output === undefined) {
      throw Error("Invalid number of arguments");
    }

    fs.rmSync(this.directory, {recursive: true, force: true});
    fs.mkdirSync(this.directory, {recursive: true});

    const target = new FileOutput();
    const written = this.gtfsFiles.map(stream => {
      const writer = target.open(
        path.join(this.directory, stream.file.filename),
        stream.file.columns
      );

      return pump(stream, writer);
    });

    for (const file of input) {
      this.inputStream.write(file);
    }

    this.inputStream.end();

    await Promise.all(written);
    await target.end();

    if (output.endsWith(".zip")) {
      await writeZip(this.directory, output);
      fs.rmSync(this.directory, {recursive: true, force: true});
    }
    else {
      // A directory of files, which is what the end to end tests want and what
      // anything piping this into another tool wants.
      fs.rmSync(output, {recursive: true, force: true});
      fs.renameSync(this.directory, output);
    }

    console.log("Complete.");
    console.log(`Memory usage: ${Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100} MB`);
  }

}

/**
 * Feed a stream's rows into a writer, respecting backpressure.
 */
async function pump<R extends FeedRow>(source: Readable, writer: RowWriter<R>): Promise<void> {
  for await (const row of source) {
    if (!writer.write(row as R)) {
      await writer.drain();
    }
  }

  writer.end();

  return writer.finished();
}
