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
 * Keyed by organisation and licence, because two enrichers drawing on the same
 * source under the same terms are one attribution - NaPTAN's stops and NaPTAN's
 * platforms are both the DfT, and crediting them twice says something untrue
 * about how many sources the feed has.
 *
 * **The accumulator spreads last, so the first declaration of a source wins.**
 * Two declarations can disagree about the URL, and taking the last would make
 * the published credit depend on the order enrichers happened to be configured
 * in - the same defect as a route number that depended on which trip reached it
 * first. Key order does not matter either way: the file is sorted by its
 * declared key before it is written.
 */
export function createAttributions(attributions: readonly Attribution[]): AttributionRow[] {
  return Object.values(attributions.reduce<AttributionRows>((rows, source) => ({
    [`${source.organisation} ${source.licence}`]: toRow(source),
    ...rows
  }), {}));
}

/**
 * The rows so far, by organisation and licence.
 */
type AttributionRows = Record<string, AttributionRow>;

function toRow(attribution: Attribution): AttributionRow {
  // A source is the authority for the data it supplies unless it says
  // otherwise. The producer of this feed is named in feed_info.txt.
  const role = attribution.role ?? "authority";

  return {
    organization_name: attribution.organisation,
    is_producer: role === "producer" ? 1 : 0,
    is_operator: role === "operator" ? 1 : 0,
    is_authority: role === "authority" ? 1 : 0,
    attribution_url: attribution.url ?? null,
    attribution_licence: attribution.licence
  };
}
