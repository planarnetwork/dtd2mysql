import {MutableFeed} from "./MutableFeed";

/**
 * Something that adds to the feed after the core build.
 *
 * The core build turns the DTD into GTFS and nothing else. Everything the DTD
 * does not know - real coordinates, step-free access, station groups, via
 * points - comes from somewhere with its own licence, its own refresh cadence
 * and its own idea of what a station is. An enricher is one of those sources.
 *
 * `priority` decides who wins when two of them write the same field, and it is
 * declared rather than derived from the order they run in. Two enrichers that
 * disagree is the normal case, not an error: NaPTAN and OSM both have a
 * coordinate for Paddington and they are not the same coordinate.
 */
export interface Enricher {
  /**
   * Stable across runs and unique. It appears in provenance.json, so renaming
   * one is a breaking change to anybody reading that file.
   */
  readonly id: string;

  /**
   * Higher wins. Ties are a conflict and are reported rather than resolved
   * quietly - see Provenance.
   */
  readonly priority: number;

  /**
   * Who to credit. D8 builds attributions.txt from these, and gates a
   * share-alike source out of the permissive tier.
   */
  readonly attribution?: Attribution;

  enrich(feed: MutableFeed): Promise<EnrichmentReport>;
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
