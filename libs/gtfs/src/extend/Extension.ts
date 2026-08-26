import {FeedRow} from "../entity/FeedRow";
import {Attribution} from "../enrich/Enricher";
import {FeedView} from "./FeedView";

/**
 * Something that adds whole files to the feed.
 *
 * The distinction from an `Enricher` is what it is allowed to touch. An
 * enricher improves an entity the DTD already produced - a better coordinate
 * for a stop that exists. An extension contributes entities the core build has
 * no concept of at all: fare areas, pathways, shapes. Neither can do the
 * other's job, and the field-level provenance an enricher writes would be
 * meaningless for a file that has no prior value to lose.
 *
 * **Fetching and building are separate**, for the same reasons they are in
 * `Enricher`: fetching is slow and I/O bound so every extension does it at
 * once, and a test can drive `files` from a fixture with no network.
 */
export interface Extension<T = unknown> {

  /**
   * Stable, unique, and shouted: `FARES_V2`. It names the extension in the
   * config and in the build log, so renaming one breaks a config.
   */
  readonly key: string;

  /**
   * Who to credit. attributions.txt is built from these, and a share-alike
   * source is kept out of the permissive tier.
   */
  readonly attribution?: Attribution;

  /**
   * Get the data. Runs concurrently with every other extension's fetch and
   * every enricher's, so it cannot see the feed or anything else's output.
   */
  fetch(): Promise<T>;

  /**
   * Build the files, given the feed to read and the data that was fetched.
   *
   * Returns rows rather than writing them. Every file this build produces is
   * sorted by a declared key before it is written, because reproducibility is a
   * property of the build and not something each producer is trusted to get
   * right - an extension that opened its own stream would sit outside that.
   */
  files(feed: FeedView, data: T): ExtensionOutput;

}

/**
 * One file an extension contributes, and how to order it.
 *
 * Build one with `extensionFile`, which keeps the rows and the key in the same
 * row type. Here they are widened to `FeedRow`, because a list of files cannot
 * hold a different row type per element and still be a list.
 */
export interface ExtensionFile {

  /** `areas.txt`. A name, not a path: the build decides where it goes. */
  readonly filename: string;

  readonly rows: readonly FeedRow[];

  /**
   * What the file is sorted by, as `copy()` sorts the core files. Rows left
   * tied by it are ordered by their whole contents, so the order is total
   * whatever this returns.
   */
  readonly key: (row: FeedRow) => KeyValue[];

}

export type KeyValue = string | number | null | undefined;

/**
 * A file, with its rows and its key checked against each other.
 *
 * The widening to `FeedRow` happens here, once, where the two are known to
 * match - rather than at each call site, where it would be a cast per file and
 * `row.area_id` on something that might be an agency would compile.
 */
export function extensionFile<T extends FeedRow>(
  filename: string,
  rows: readonly T[],
  key: (row: T) => KeyValue[]
): ExtensionFile {
  return {filename, rows, key: key as (row: FeedRow) => KeyValue[]};
}

export interface ExtensionOutput {
  readonly files: readonly ExtensionFile[];
  readonly report: ExtensionReport;
}

/**
 * What an extension did, in numbers.
 *
 * `dropped` is the one that matters. An extension builds files out of a source
 * that has its own idea of what a station is, so some of what it knows about
 * will not be in this feed - and a fare area published with half its members
 * missing is worse than one not published at all, because nothing downstream
 * can tell the difference.
 */
export interface ExtensionReport {
  readonly extension: string;
  /** Entities written out. */
  readonly written: number;
  /** Entities the source had that this feed could not place. */
  readonly dropped: number;
  /** Anything worth a human reading, kept short. */
  readonly notes?: readonly string[];
}
