import * as fs from "fs";
import {Columns, FeedRow, GTFSOutput, RowWriter} from "@gb-transit/gtfs-schema";
import {CSVRowWriter} from "./CSVRowWriter";

export class FileOutput implements GTFSOutput {

  private readonly files: Promise<void>[] = [];

  /**
   * A CSV writer onto a file.
   *
   * What the build holds is the writer, and the writer finishes as soon as it
   * has handed its last row on - which is not when the row is on disk. The file
   * at the other end is the thing to wait for, so it is collected here and
   * awaited by end().
   */
  public open<R extends FeedRow>(filename: string, columns: Columns<R>): RowWriter<R> {
    const writer = new CSVRowWriter(columns, fs.createWriteStream(filename));

    this.files.push(writer.finished());

    return writer;
  }

  public write(filename: string, contents: string): void {
    fs.writeFileSync(filename, contents);
  }

  public async end(): Promise<void> {
    await Promise.all(this.files);
  }

}
