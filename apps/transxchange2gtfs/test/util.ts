import {Transform} from "stream";

export function awaitStream<T>(stream: Transform, fn: StreamTest<T>) {
  return new Promise(resolve => {
    const data: T[] = [];

    stream.on("data", row => data.push(row));
    stream.on("end", () => {
      fn(data);
      resolve();
    });
  });
}

export type StreamTest<T> = (data: T[]) => any;
