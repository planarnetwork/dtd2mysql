import * as fs from "node:fs";
import * as readline from "node:readline";
import * as zlib from "node:zlib";
import {once} from "node:events";
import {pipeline} from "node:stream/promises";
import type {Writable} from "node:stream";
import {frontCode, readPatterns} from "raptor-journey-planner";

/**
 * How hard the finished file is compressed. The same five raptor writes a shard at: brotli stops
 * being free above it.
 */
const QUALITY = 5;

/**
 * Lines given to `frontCode` at a time. Only so the whole file is not held: front coding a chunk
 * gives the same answer as front coding the lot, see `code` below.
 */
const CHUNK = 10_000;

/**
 * The patterns in a file raptor wrote, in the order it wrote them.
 *
 * Streamed. There are 34 million of them and no reason to hold any two at once.
 */
export function readPatternFile(file: string): AsyncIterable<string[]> {
  // pipeline rather than pipe, which does not forward an error from the source.
  const decompressed = zlib.createBrotliDecompress();
  const done = pipeline(fs.createReadStream(file), decompressed);
  const lines = readline.createInterface({
    input: decompressed,
    crlfDelay: Number.POSITIVE_INFINITY
  });

  return merged(readPatterns(lines), done);
}

/**
 * The patterns, or whatever stopped the stream that was carrying them. `readPatterns` ends quietly
 * when its input is destroyed, which would otherwise make a failed read a short file.
 */
async function* merged(
  patterns: AsyncIterable<string[]>,
  done: Promise<void>
): AsyncGenerator<string[]> {
  const failed = done.then(() => undefined, (err: Error) => err);

  yield* patterns;

  const err = await failed;

  if (err !== undefined) {
    throw err;
  }
}

/**
 * Write sorted patterns out in raptor's format, and say how many there were.
 */
export async function writePatternFile(
  patterns: AsyncIterable<string[]>,
  output: string
): Promise<{patterns: number; bytes: number}> {
  const compressed = zlib.createBrotliCompress({
    params: {[zlib.constants.BROTLI_PARAM_QUALITY]: QUALITY}
  });
  // Observed as it is created, so a sink that fails during the loop below is an error rather than
  // an unhandled rejection.
  const written = pipeline(compressed, fs.createWriteStream(output))
    .then(() => undefined, (err: Error) => err);

  let total = 0;

  for await (const line of code(patterns)) {
    total++;

    await write(compressed, line, written);
  }

  compressed.end();

  const failed = await written;

  if (failed !== undefined) {
    throw failed;
  }

  return {patterns: total, bytes: (await fs.promises.stat(output)).size};
}

/**
 * Front code a stream of patterns.
 *
 * `frontCode` is synchronous and over a synchronous iterable, so the patterns are handed to it a
 * chunk at a time. A line is coded against the line before it and nothing else, so a chunk that
 * starts with its predecessor and drops that first result gives the bytes a single pass would.
 */
async function* code(patterns: AsyncIterable<string[]>): AsyncGenerator<string> {
  let chunk: string[] = [];
  let previous: string | undefined;

  for await (const pattern of patterns) {
    chunk.push(pattern.join(""));

    if (chunk.length === CHUNK) {
      yield* codeChunk(chunk, previous);

      previous = chunk[chunk.length - 1];
      chunk = [];
    }
  }

  if (chunk.length > 0) {
    yield* codeChunk(chunk, previous);
  }
}

function* codeChunk(chunk: string[], previous: string | undefined): Generator<string> {
  if (previous === undefined) {
    yield* frontCode(chunk);

    return;
  }

  const coded = frontCode([previous, ...chunk]);

  // the predecessor is only here to code the first line of the chunk against; it has been written
  coded.next();

  yield* coded;
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
