import {Enricher, EnrichmentReport} from "./Enricher";
import {MutableFeed} from "./MutableFeed";

/**
 * Run the enrichers over a built feed and say what each of them did.
 *
 * In declared priority order, highest first, purely so the log reads in the
 * order a reader expects. It does not affect the outcome - that is the point of
 * priority being declared rather than positional - and a test asserts as much.
 */
export async function enrich(feed: MutableFeed, enrichers: readonly Enricher[]): Promise<EnrichmentReport[]> {
  const ordered = [...enrichers].sort((a, b) =>
    b.priority - a.priority || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  );

  const reports: EnrichmentReport[] = [];

  for (const enricher of ordered) {
    const report = await enricher.enrich(feed);

    reports.push(report);
    console.log(
      `${enricher.id}: matched ${report.matched}, unmatched ${report.unmatched}, ` +
      `conflicts ${report.conflicts}`
    );

    for (const note of report.notes ?? []) {
      console.log(`  ${note}`);
    }
  }

  return reports;
}

/**
 * provenance.json: every field an enricher wrote, and every write that lost.
 *
 * Written whenever an enricher ran, because the question it answers - why does
 * this feed say that - is only ever asked after the fact.
 */
export function provenanceFile(feed: MutableFeed, reports: readonly EnrichmentReport[]) {
  return {
    enrichers: reports.map(report => ({
      id: report.enricher,
      matched: report.matched,
      unmatched: report.unmatched,
      conflicts: report.conflicts
    })),
    conflicts: feed.ledger.conflicts,
    fields: feed.ledger.entries()
  };
}
