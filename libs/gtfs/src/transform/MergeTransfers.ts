import {Transfer, TransferType} from "../entity/Transfer";
import {FixedLink} from "../entity/FixedLink";
import {CRS, StopID} from "../entity/Stop";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

/**
 * The station interchange times and the fixed links, as one transfers.txt.
 *
 * transfers.txt is the GTFS file for "you can get from this stop to that one,
 * and it takes this long", which is what both of them describe. The mode, the
 * operating window and the days a link runs travel with it as producer
 * extension columns.
 *
 * **One row per pair, because more than one is invalid.** The primary key of
 * transfers.txt is the stop pair, and the validator raises `duplicate_key` on a
 * repeat. The ALF holds one record per window and day pattern, so 8,514 records
 * describe 2,406 pairs, and the pair has to be described once.
 *
 * Where several links describe a pair, the row is their envelope:
 *
 * - `min_transfer_time` is the shortest, which is what the field means;
 * - `mode` is every mode, pipe separated and sorted - `METRO|WALK`;
 * - the window is the earliest start to the latest end, and a day is set if any
 *   of them runs on it.
 *
 * So the row says when the connection is available by *some* means, not when it
 * is available by each. 2,114 of the 2,406 pairs have a single mode and for
 * those it is exact. `--links` still writes the unsummarised records.
 *
 * Both sources describe a pair of stations by CRS, and that is what the merging
 * works on. `stations` says which stations the feed publishes and what their
 * stop ids are, so the rows come out referencing the station rather than any of
 * the boarding points beneath it - an interchange is between stations.
 */
export function mergeTransfers(
  transfers: Transfer[],
  links: FixedLink[],
  stations: ReadonlyMap<CRS, StopID>
): Transfer[] {
  const merged = new Map<string, Transfer>();
  const modes = new Map<string, Set<string>>();
  let summarised = 0;

  for (const transfer of transfers) {
    if (stations.has(transfer.from_stop_id) && stations.has(transfer.to_stop_id)) {
      merged.set(key(transfer.from_stop_id, transfer.to_stop_id), transfer);
    }
  }

  for (const link of links) {
    if (!stations.has(link.from_stop_id) || !stations.has(link.to_stop_id)) {
      continue;
    }

    const id = key(link.from_stop_id, link.to_stop_id);
    const existing = merged.get(id);
    const seen = modes.get(id) ?? new Set<string>();

    seen.add(link.mode);
    modes.set(id, seen);

    if (existing === undefined || existing.mode === null) {
      merged.set(id, fromLink(link));
      continue;
    }

    summarised++;
    merged.set(id, widen(existing, link));
  }

  for (const [id, transfer] of merged) {
    const seen = modes.get(id);

    if (seen !== undefined) {
      transfer.mode = [...seen].sort().join("|");
    }
  }

  if (links.length > 0) {
    console.log(
      `Merged ${links.length} fixed links into transfers.txt as ${links.length - summarised} rows; ` +
      `${summarised} described a pair already covered and were summarised into it`
    );
  }

  return [...merged.values()].map(transfer => ({
    ...transfer,
    from_stop_id: stations.get(transfer.from_stop_id)!,
    to_stop_id: stations.get(transfer.to_stop_id)!
  }));
}

function fromLink(link: FixedLink): Transfer {
  return {
    from_stop_id: link.from_stop_id,
    to_stop_id: link.to_stop_id,
    transfer_type: TransferType.MinTime,
    min_transfer_time: link.duration,
    mode: link.mode,
    start_time: link.start_time,
    end_time: link.end_time,
    start_date: link.start_date,
    end_date: link.end_date,
    monday: flag(link.monday),
    tuesday: flag(link.tuesday),
    wednesday: flag(link.wednesday),
    thursday: flag(link.thursday),
    friday: flag(link.friday),
    saturday: flag(link.saturday),
    sunday: flag(link.sunday)
  };
}

/**
 * A day flag, whatever the source called it.
 *
 * MySQL returns a TINYINT as a number from a plain select and as a *string*
 * through a UNION, and getFixedLinks is a UNION. Both forms write as 1, so the
 * difference only shows when something compares them - and comparing "1" to 1
 * turns every day off.
 */
function flag(value: unknown): 0 | 1 {
  return Number(value) === 1 ? 1 : 0;
}

/**
 * The envelope of two descriptions of the same pair.
 */
function widen(transfer: Transfer, link: FixedLink): Transfer {
  const widened = {...transfer};

  widened.min_transfer_time = Math.min(transfer.min_transfer_time, link.duration);
  widened.start_time = min(transfer.start_time, link.start_time);
  widened.end_time = max(transfer.end_time, link.end_time);
  widened.start_date = min(transfer.start_date, link.start_date);
  widened.end_date = max(transfer.end_date, link.end_date);

  for (const day of DAYS) {
    widened[day] = flag(transfer[day]) === 1 || flag(link[day]) === 1 ? 1 : 0;
  }

  return widened;
}

function min(a: string | null, b: string): string {
  return a === null || b < a ? b : a;
}

function max(a: string | null, b: string): string {
  return a === null || b > a ? b : a;
}

/**
 * A station interchange row: the same stop twice, and no link to describe.
 */
export function interchange(stop: CRS, seconds: number): Transfer {
  return {
    from_stop_id: stop,
    to_stop_id: stop,
    transfer_type: TransferType.MinTime,
    min_transfer_time: seconds,
    mode: null,
    start_time: null,
    end_time: null,
    start_date: null,
    end_date: null,
    monday: null,
    tuesday: null,
    wednesday: null,
    thursday: null,
    friday: null,
    saturday: null,
    sunday: null
  };
}

function key(from: CRS, to: CRS): string {
  return `${from}|${to}`;
}
