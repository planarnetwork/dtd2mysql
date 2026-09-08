import * as fs from "node:fs";
import * as readline from "node:readline";
import * as zlib from "node:zlib";
import {once} from "node:events";
import {pipeline} from "node:stream/promises";
import type {Writable} from "node:stream";
import {BROTLI_QUALITY, CODE_WIDTH, FrontCoder, compressionFor, sharedStops} from
  "transfer-pattern-planner";

/**
 * Compress and decompress the way the planner does, which is to say by what the file is called:
 * `.gz` is gzip and anything else is brotli. Brotli is the smaller of the two; gzip is the one a
 * browser can decompress, since none has `DecompressionStream("brotli")`.
 */
function compressorFor(file: string): zlib.BrotliCompress | zlib.Gzip {
  return compressionFor(file) === "gzip"
    ? zlib.createGzip()
    : zlib.createBrotliCompress({
      params: {[zlib.constants.BROTLI_PARAM_QUALITY]: BROTLI_QUALITY}
    });
}

function decompressorFor(file: string): zlib.BrotliDecompress | zlib.Gunzip {
  return compressionFor(file) === "gzip" ? zlib.createGunzip() : zlib.createBrotliDecompress();
}

/**
 * The patterns in a pattern file, in the order they were written.
 *
 * Streamed. There are tens of millions of them and no reason to hold any two at once.
 */
export function readPatternFile(file: string): AsyncIterable<string[]> {
  return merged(decode(readPatternLines(file)));
}

/**
 * The lines of a pattern file, still front coded, for a reader that wants them as they were
 * written.
 */
export function readPatternLines(file: string): AsyncIterable<string> {
  // pipeline rather than pipe, which does not forward an error from the source.
  const decompressed = decompressorFor(file);
  const done = pipeline(fs.createReadStream(file), decompressed);
  const lines = readline.createInterface({
    input: decompressed,
    crlfDelay: Number.POSITIVE_INFINITY
  });

  return merged(lines, done);
}

/**
 * The stations of each line, given what it shares with the line before it.
 */
async function* decode(lines: AsyncIterable<string>): AsyncGenerator<string[]> {
  let previous: string[] = [];

  for await (const line of lines) {
    if (line === "") {
      continue;
    }

    const pattern = previous.slice(0, sharedStops(line));

    for (let at = 1; at < line.length; at += CODE_WIDTH) {
      pattern.push(line.slice(at, at + CODE_WIDTH));
    }

    yield pattern;
    previous = pattern;
  }
}

/**
 * The patterns, or whatever stopped the stream that was carrying them. A reader ends quietly when
 * its input is destroyed, which would otherwise make a failed read a short file.
 */
async function* merged<T>(items: AsyncIterable<T>, done?: Promise<void>): AsyncGenerator<T> {
  const failed = done?.then(() => undefined, (err: Error) => err);

  yield* items;

  const err = await failed;

  if (err !== undefined) {
    throw err;
  }
}

/**
 * Write sorted patterns out as a pattern file, and say how many there were.
 */
export async function writePatternFile(
  patterns: AsyncIterable<string[]>,
  output: string
): Promise<{patterns: number; bytes: number}> {
  const compressed = compressorFor(output);
  // Observed as it is created, so a sink that fails during the loop below is an error rather than
  // an unhandled rejection.
  const written = pipeline(compressed, fs.createWriteStream(output))
    .then(() => undefined, (err: Error) => err);
  const coder = new FrontCoder();

  let total = 0;

  for await (const pattern of patterns) {
    total++;

    await write(compressed, coder.code(pattern.join("")), written);
  }

  compressed.end();

  const failed = await written;

  if (failed !== undefined) {
    throw failed;
  }

  return {patterns: total, bytes: (await fs.promises.stat(output)).size};
}

/**
 * Write a line, waiting only where the stream has fallen far enough behind to say so. Against the
 * pipeline as well as the drain, since a destroyed stream never drains.
 */
async function write(stream: Writable, line: string, written: Promise<Error | void>): Promise<void> {
  if (stream.write(`${line}\n`)) {
    return;
  }

  const failed = await Promise.race([once(stream, "drain").then(() => undefined), written]);

  if (failed !== undefined) {
    throw failed;
  }
}
