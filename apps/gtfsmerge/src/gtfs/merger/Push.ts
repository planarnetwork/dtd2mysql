import {RowWriter} from "@gb-transit/gtfs-schema";

/**
 * Write a row, waiting if the writer's buffer is full.
 *
 * Every merger applies backpressure the same way, and a merge of a national feed
 * writes three million stop times through it, so it is one function rather than a
 * private copy in each of them.
 */
export function push<T>(writer: RowWriter<T>, row: T): Promise<void> | void {
  if (!writer.write(row)) {
    return writer.drain();
  }
}

/**
 * Close a writer and wait for what it was given to reach the file.
 */
export function close<T>(writer: RowWriter<T>): Promise<void> {
  writer.end();

  return writer.finished();
}
