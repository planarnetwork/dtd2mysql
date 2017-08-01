
import {Writable} from "stream";

export interface GTFSOutput {
  end(): void;
  open(filename: string): Writable;
}
