/**
 * attributions.txt, as it is written: who the data behind this feed belongs to.
 *
 * Not a courtesy. NaPTAN is Open Government Licence v3.0 and the licence makes
 * acknowledgement a condition of use, so a feed carrying DfT survey coordinates
 * without this row is a feed being used outside its licence.
 *
 * **The licence is a producer extension.** The spec has `organization_name` and
 * a URL and no field for the terms, which is the one thing an attribution
 * statement has to say. The spec lets a producer add fields it does not define
 * and requires consumers to ignore ones they do not recognise, so a reader that
 * wants only standard attributions still gets a standard file. The alternative
 * was to bury the licence in `attribution_url`, where nothing could read it.
 */
export interface AttributionRow {
  organization_name: string;
  /**
   * Each source is the authority for its own data - the DfT for NaPTAN, RDG for
   * the timetable - rather than the producer of this feed, which is named in
   * feed_info.txt. The spec requires at least one of the three roles.
   */
  is_producer: 0 | 1;
  is_operator: 0 | 1;
  is_authority: 0 | 1;
  attribution_url: string | null;
  /** Producer extension. See above. */
  attribution_licence: string;
}

/**
 * Which of the GTFS roles an organisation has in this feed. A source is the
 * authority for the data it supplies unless it says otherwise.
 */
export type AttributionRole = "producer" | "operator" | "authority";
