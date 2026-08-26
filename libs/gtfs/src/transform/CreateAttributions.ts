import {Attribution} from "../enrich/Enricher";
import {AttributionRow} from "../entity/Attribution";

/**
 * The timetable itself, which no enricher declares because it is not one.
 *
 * A feed that credits the source of its coordinates and not the source of its
 * trains would be worse than one crediting nobody: it reads as a complete list.
 */
export const TIMETABLE_ATTRIBUTION: Attribution = {
  organisation: "Rail Delivery Group",
  licence: "Rail Settlement Plan data licence",
  url: "https://raildata.org.uk/",
  shareAlike: false
};

/**
 * attributions.txt, from what each source declared about itself.
 *
 * Deduplicated by organisation and licence, because two enrichers drawing on
 * the same source under the same terms are one attribution - NaPTAN's stops and
 * NaPTAN's platforms are both the DfT, and crediting them twice says something
 * that is not true about how many sources the feed has.
 *
 * **The first declaration of a source wins**, not the last. Two declarations of
 * one source can still disagree about its URL, and taking the last would make
 * the published credit depend on the order enrichers happened to be configured
 * in - the same defect as a route number that depended on which trip reached it
 * first. The order is fixed: the timetable, then enrichers, then extensions.
 */
export function createAttributions(attributions: readonly Attribution[]): AttributionRow[] {
  const rows = new Map<string, AttributionRow>();

  for (const attribution of attributions) {
    const role = attribution.role ?? "authority";
    const key = `${attribution.organisation} ${attribution.licence}`;

    if (rows.has(key)) {
      continue;
    }

    rows.set(key, {
      organization_name: attribution.organisation,
      is_producer: role === "producer" ? 1 : 0,
      is_operator: role === "operator" ? 1 : 0,
      is_authority: role === "authority" ? 1 : 0,
      attribution_url: attribution.url ?? null,
      attribution_licence: attribution.licence
    });
  }

  return [...rows.values()];
}
