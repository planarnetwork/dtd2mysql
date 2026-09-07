import {Transform} from "node:stream";

/**
 * Collect everything a stream emits, then assert on it.
 *
 * The error listener matters: a throw inside `_transform` means its callback is
 * never called, so without it the stream simply stalls and the test fails five
 * seconds later saying nothing about why.
 */
export function awaitStream<T>(stream: Transform, fn: StreamTest<T>) {
  return new Promise<void>((resolve, reject) => {
    const data: T[] = [];

    stream.on("data", row => data.push(row));
    stream.on("error", reject);
    stream.on("end", () => {
      try {
        fn(data);
        resolve();
      }
      catch (err) {
        reject(err);
      }
    });
  });
}

export type StreamTest<T> = (data: T[]) => any;
