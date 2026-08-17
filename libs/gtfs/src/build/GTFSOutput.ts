
import {Writable} from "stream";

export interface GTFSOutput {

  /**
   * Open a file to write rows to. The stream returned is the one the build
   * writes through, which may sit in front of the destination.
   */
  open(filename: string): Writable;

  /**
   * Write a whole file at once, for the things that are not rows.
   *
   * provenance.json is a document, not a table: nesting it into columns
   * produced a file of `[object Object]`. Anything with a shape belongs here
   * rather than being forced through the CSV writer.
   */
  write(filename: string, contents: string): void | Promise<void>;

  /**
   * Resolves when everything opened has reached its destination.
   */
  end(): void | Promise<void>;

}
