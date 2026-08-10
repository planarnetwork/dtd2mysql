import {Transfer, TransferType} from "../entity/Transfer";
import {FixedLink} from "../entity/FixedLink";
import {CRS} from "../entity/Stop";

/**
 * The station interchange times and the fixed links, as one transfers.txt.
 *
 * `links.txt` was this project's own invention and no consumer reads it. GTFS
 * has a file for "you can get from this stop to that one, and it takes this
 * long", so the links belong in it.
 *
 * Two things do not survive the move, because `transfers.txt` has nowhere to put
 * them:
 *
 * - **when the link is available.** The ALF holds one record per time window and
 *   day pattern, which is why 8,514 rows describe only 2,406 pairs. A transfer
 *   is unconditional, so the windows go and the pair is offered at every hour it
 *   is not really available. Overstating a tube connection at 03:00 is the cost
 *   of expressing it at all; `links.txt` stays behind `--links` for a release so
 *   anyone depending on the windows has somewhere to go.
 * - **how you make the journey.** TUBE, WALK, BUS and the rest have no field.
 *
 * Where several links describe one pair, the shortest wins: `min_transfer_time`
 * is the minimum time the transfer needs, and the fastest of several ways of
 * making it is exactly that.
 */
export function mergeTransfers(
  transfers: Transfer[],
  links: FixedLink[],
  published: ReadonlySet<CRS>
): Transfer[] {
  const merged = new Map<string, Transfer>();
  let windows = 0;

  for (const transfer of transfers) {
    if (published.has(transfer.from_stop_id) && published.has(transfer.to_stop_id)) {
      merged.set(key(transfer.from_stop_id, transfer.to_stop_id), transfer);
    }
  }

  for (const link of links) {
    if (!published.has(link.from_stop_id) || !published.has(link.to_stop_id)) {
      continue;
    }

    const id = key(link.from_stop_id, link.to_stop_id);
    const existing = merged.get(id);

    if (existing) {
      windows++;

      if (link.duration >= existing.min_transfer_time) {
        continue;
      }
    }

    merged.set(id, {
      from_stop_id: link.from_stop_id,
      to_stop_id: link.to_stop_id,
      transfer_type: TransferType.MinTime,
      min_transfer_time: link.duration
    });
  }

  if (windows > 0) {
    console.log(
      `Merged ${links.length} fixed links into transfers.txt as ${links.length - windows} rows; ` +
      `${windows} described a pair already covered, by another mode or in another time window`
    );
  }

  return [...merged.values()];
}

function key(from: CRS, to: CRS): string {
  return `${from}|${to}`;
}
