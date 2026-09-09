import {AgencyID, CRS, Duration} from "@gb-transit/gtfs-schema";

/**
 * Where a train ends one schedule and starts another without the passengers getting off.
 *
 * The Sutton loop is the case this exists for. A Thameslink service runs out of London via
 * Wimbledon, terminates at Sutton, and a couple of minutes later starts again from the same
 * platform back towards London via Hackbridge. The CIF publishes the two halves as unconnected
 * schedules with no association between them, so a journey planner applying Sutton's interchange
 * time cannot join them, and a passenger who in reality stays in their seat is told the connection
 * does not exist.
 *
 * **This is a whitelist, not a heuristic.** An in-seat transfer asserts that the same unit carries
 * on, which is true of the loop and is not true of every train that terminates and starts again
 * shortly afterwards - a unit can as easily go to the depot and a different one come off it. A new
 * entry needs the same evidence the loop has, that the service is worked as one train, and a tight
 * turnaround on its own is not that evidence.
 *
 * Each direction is a rule of its own, because which arm the train arrives on decides which one it
 * leaves by, and the two are not interchangeable.
 */
export interface ReversalRule {
  /** The ATOC code both trains must be operated by. */
  operator: AgencyID;
  /** Where the train turns back: the arriving train's last call and the departing train's first. */
  at: CRS;
  /** A call that identifies the arm the train arrives on. */
  arrivesVia: CRS;
  /** A call that identifies the arm it leaves by. */
  departsVia: CRS;
  /** The shortest turnaround that is a turnaround rather than one train read twice. */
  minTurnaround: Duration;
  /** The longest turnaround a passenger can be expected to sit through. */
  maxTurnaround: Duration;
}

export const reversalRules: readonly ReversalRule[] = [
  {operator: "TL", at: "SUO", arrivesVia: "WIM", departsVia: "HCB", minTurnaround: 60, maxTurnaround: 600},
  {operator: "TL", at: "SUO", arrivesVia: "HCB", departsVia: "WIM", minTurnaround: 60, maxTurnaround: 600}
];
