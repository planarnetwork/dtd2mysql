import {ColumnStore} from "./ColumnStore.js";

/** transfer_type 4: the vehicle of one trip carries on as another. */
export const CONTINUATION = 4;

export interface TripLink {
  readonly row: number;
  readonly fromTripId: string;
  readonly toTripId: string;
  /** Platforms rather than the station, so they place the coupling within each trip. */
  readonly fromStopId?: string;
  readonly toStopId?: string;
}

/**
 * The trips a trip splits from or joins to.
 *
 * A GB feed publishes a split or a join as two trips and a transfers.txt row of type 4 between them,
 * so a passenger staying in their seat across a coupling is two trips in the data and one journey in
 * life. Following that link in both directions is most of what the trip view is for: from a portion
 * you want the trip it was part of, and from the base you want the portions it became.
 *
 * Note what this cannot do. An overlay - an STP schedule replacing part of a permanent one - is
 * exclusions on the permanent trip plus a separate new trip, and nothing links those two at all. The
 * calendar is where that shows up, not here.
 */
export class Links {

  private readonly forwards = new Map<string, TripLink[]>();
  private readonly backwards = new Map<string, TripLink[]>();

  constructor(transfers: ColumnStore | undefined) {
    for (let row = 0; transfers !== undefined && row < transfers.rows; row++) {
      if (Number(transfers.value("transfer_type", row)) !== CONTINUATION) {
        continue;
      }

      const fromTripId = transfers.value("from_trip_id", row);
      const toTripId = transfers.value("to_trip_id", row);

      if (fromTripId === undefined || toTripId === undefined) {
        continue; // a type 4 with no trips on it names no coupling; the Integrity check reports it
      }

      const link: TripLink = {
        row,
        fromTripId,
        toTripId,
        fromStopId: transfers.value("from_stop_id", row),
        toStopId: transfers.value("to_stop_id", row)
      };

      push(this.forwards, fromTripId, link);
      push(this.backwards, toTripId, link);
    }
  }

  /** What this trip's vehicle carries on as. */
  public onwardOf(tripId: string): readonly TripLink[] {
    return this.forwards.get(tripId) ?? [];
  }

  /** What carried on as this trip. */
  public priorTo(tripId: string): readonly TripLink[] {
    return this.backwards.get(tripId) ?? [];
  }

  /** Every link naming this trip at either end, which is what the trip view shows. */
  public of(tripId: string): readonly TripLink[] {
    return [...this.priorTo(tripId), ...this.onwardOf(tripId)];
  }

  public get size(): number {
    return [...this.forwards.values()].reduce((total, links) => total + links.length, 0);
  }

}

function push(index: Map<string, TripLink[]>, key: string, link: TripLink): void {
  const existing = index.get(key);

  if (existing === undefined) {
    index.set(key, [link]);
  }
  else {
    existing.push(link);
  }
}
