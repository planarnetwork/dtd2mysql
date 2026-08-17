
import {Writable} from "stream";

export interface GTFSOutput {

  /**
   * Open a file to write rows to. The stream returned is the one the build
   * writes through, which may sit in front of the destination.
   */
  open(filename: string): Writable;

  /**
   * Resolves when everything opened has reached its destination.
   */
  end(): void | Promise<void>;

}
