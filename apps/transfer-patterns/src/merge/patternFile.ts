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
  // pipeline rather than pipe, which does not forward an error from the source: a file that is not
  // there and a file that is not brotli should fail the same way.
  const decompressed = zlib.createBrotliDecompress();
  const done = pipeline(fs.createReadStream(file), decompressed);
  const lines = readline.createInterface({
    input: decompressed,
    crlfDelay: Number.POSITIVE_INFINITY
  });

  return merged(readPatterns(lines), done);
}

/**
 * The patterns, or whatever stopped the stream that was carrying them.
 *
 * `readPatterns` ends quietly when its input is destroyed, so without this a read that failed half
 * way through is a short file rather than an error.
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
 *
 * The format is raptor's and so is the code that writes it, so `readPatterns` reads a file this
 * produced and one its own merge produced without knowing which was which.
 */
export async function writePatternFile(
  patterns: AsyncIterable<string[]>,
  output: string
): Promise<{patterns: number; bytes: number}> {
  const compressed = zlib.createBrotliCompress({
    params: {[zlib.constants.BROTLI_PARAM_QUALITY]: QUALITY}
  });
  // Observed as it is created rather than where it is awaited: the loop below runs for minutes, and
  // a sink failing during it would reject this with nothing listening, which node treats as an
  // unhandled rejection and takes the process down for.
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
 * Front code a stream of patterns, using raptor's own `frontCode`.
 *
 * That is a synchronous generator over a synchronous iterable, and 34 million patterns arrive
 * asynchronously and will not be held, so they are handed over a chunk at a time. A line is coded
 * against the line before it and nothing else, so a chunk that starts with its predecessor and
 * throws away that first result gives the same bytes a single pass would - there is no window to
 * lose across the seam.
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
 * Write a line, waiting only where the stream has fallen far enough behind to say so.
 *
 * Against the pipeline as well as the drain, since a stream that has already been destroyed will
 * never drain.
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
