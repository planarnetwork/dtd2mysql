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

export function splitCSV(csv: string): string[] {
  const row = [];
  let i = 0;

  while (i < csv.length) {
    if (csv.charAt(i) === "\"") {
      const endIndex = csv.indexOf("\"", i + 1);
      const value = csv.substring(i + 1, endIndex);

      row.push(value);
      i = endIndex + 2;
    }
    else {
      const endIndex = csv.indexOf(",", i);
      const value = csv.substring(i, endIndex);

      row.push(value);
      i = endIndex + 1;
    }
  }

  return row;
}