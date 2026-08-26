/**
 * A NaPTAN station name as a rider would recognise it.
 *
 * NaPTAN calls it "Aberdare Rail Station" where the departure boards say
 * "Aberdare". That suffix was the whole reason D3 declined to take names, and
 * removing it is all it takes: of the 2,580 stations both NaPTAN and the
 * override file describe, 2,454 names are identical once it is gone.
 *
 * Unlike the matching form used elsewhere this keeps case and punctuation,
 * because the result is published rather than compared.
 */
export function stationName(name: string): string {
  return name
    .replace(/\s*\((rail|railway)\s+station\)\s*$/i, "")
    // `(^|\s+)` rather than `\s+`, so a record whose whole name is the suffix
    // comes back empty instead of "Rail".
    .replace(/(^|\s+)(rail|railway)\s+station\s*$/i, "")
    .replace(/(^|\s+)station\s*$/i, "")
    .trim();
}
