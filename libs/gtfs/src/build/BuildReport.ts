import {AttributionRow} from "../entity/Attribution";
import {EnrichmentReport} from "../enrich/Enricher";
import {ExtensionReport} from "../extend/Extension";

/**
 * What the sources did to this feed, small enough to publish beside it.
 *
 * Distinct from provenance.json, which records every field an enricher wrote
 * and every write that lost - thousands of entries, and the answer to "why does
 * this feed say that". This answers "did the sources work", which is a
 * different question asked by different people, and it has to survive somewhere
 * a workflow log does not: an unmatched count printed to a run that expires in
 * fourteen days is a number nobody will ever compare against last month's.
 */
export interface BuildReport {
  readonly enrichers: readonly EnrichmentReport[];
  readonly extensions: readonly ExtensionReport[];
  /** Who the feed is built from, as attributions.txt credits them. */
  readonly sources: readonly SourceReport[];
}

export interface SourceReport {
  readonly organisation: string;
  readonly licence: string;
  readonly url?: string;
}

/**
 * Built from the rows attributions.txt is written from, not from the
 * declarations behind them, so the two cannot disagree about how many sources
 * the feed has. Taking the declarations listed Rail Delivery Group twice, once
 * for the timetable and once for the station groups drawn from the same feed.
 */
export function buildReport(
  enrichers: readonly EnrichmentReport[],
  extensions: readonly ExtensionReport[],
  attributions: readonly AttributionRow[]
): BuildReport {
  return {
    enrichers,
    extensions,
    sources: attributions.map(row => ({
      organisation: row.organization_name,
      licence: row.attribution_licence,
      url: row.attribution_url ?? undefined
    }))
  };
}
