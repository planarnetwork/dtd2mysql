import {MutableFeed} from "./MutableFeed";

/**
 * Something that adds to the feed after the core build.
 *
 * The core build turns the DTD into GTFS and nothing else. Everything the DTD
 * does not know - real coordinates, step-free access, station groups, via
 * points - comes from somewhere with its own licence, its own refresh cadence
 * and its own idea of what a station is. An enricher is one of those sources.
 *
 * **Fetching and applying are separate** because they have nothing in common.
 * Fetching is slow and I/O bound - a NaPTAN download, an API call, an OSM
 * extract - so every enricher fetches at once. Applying is ordered and cheap.
 * Splitting them is also what lets a test drive `apply` with a fixture instead
 * of a network, and gives caching one place to live.
 */
export interface Enricher<T = unknown> {
  /**
   * Stable, unique, and shouted: `ACCESSIBILITY_INFO`. It appears in
   * provenance.json and in `dependsOn`, so renaming one breaks both a config
   * and anybody reading the output.
   */
  readonly key: string;

  /**
   * Enrichers whose output this one needs, by key. Decides the order `apply`
   * runs in - OSM pathways cannot join platforms that NaPTAN has not created
   * yet.
   *
   * Nothing to do with `priority`. This is "what has to exist first"; priority
   * is "who wins when we disagree", and confusing the two produces an order
   * that looks deliberate and is not.
   */
  readonly dependsOn: readonly string[];

  /**
   * Higher wins when two enrichers write the same field. Declared rather than
   * positional, so the feed does not change when a config is reordered. Ties
   * are a conflict and are reported rather than resolved quietly.
   */
  readonly priority: number;

  /**
   * Who to credit. D8 builds attributions.txt from these, and keeps a
   * share-alike source out of the permissive tier.
   */
  readonly attribution?: Attribution;

  /**
   * Get the data. Runs concurrently with every other enricher's fetch, so it
   * **cannot see another enricher's output** - and cannot see the feed at all.
   * An enricher that would like to fetch only what the feed needs should fetch
   * broadly and narrow it in `apply`.
   */
  fetch(): Promise<T>;

  /**
   * Write it in, in dependency order.
   */
  apply(feed: MutableFeed, data: T): EnrichmentReport;
}

export interface Attribution {
  readonly organisation: string;
  readonly licence: string;
  readonly url?: string;
  /**
   * Whether the licence obliges the whole feed to carry it. D8 keeps these out
   * of the permissive build rather than discovering the obligation later.
   */
  readonly shareAlike: boolean;
}

/**
 * What an enricher did, in numbers.
 *
 * `unmatched` is the one that matters and the one an enricher is tempted not to
 * count: a source that matched 12 stations out of 3,000 has not enriched the
 * feed, it has added noise, and the only way anybody notices is if the run says
 * so.
 */
export interface EnrichmentReport {
  readonly enricher: string;
  /** Entities the source had something to say about, and which exist here. */
  readonly matched: number;
  /** Entities the source knew about that this feed does not contain. */
  readonly unmatched: number;
  /** Fields another enricher had already written with a different value. */
  readonly conflicts: number;
  /** Anything worth a human reading, kept short. */
  readonly notes?: readonly string[];
}
