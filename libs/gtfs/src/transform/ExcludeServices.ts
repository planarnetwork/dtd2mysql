import {AgencyID, RouteType} from "@gb-transit/gtfs-schema";
import {Schedule} from "../model/Schedule";
import {ScheduleIndex} from "./ApplyAssociations";

/**
 * The services a build leaves out.
 *
 * The CIF carries services National Rail does not hold authority over - the
 * tube, the Metro, the ferries and the buses - and a feed combined with other
 * sources has better answers for those elsewhere.
 */
export interface ServiceExclusions {
  /**
   * Modes to leave out whoever runs them. A replacement bus is a mode of its
   * own, so `Bus` leaves the replacements alone.
   */
  readonly modes: readonly RouteType[];
  /**
   * Operators to leave out whatever they are running, replacement buses
   * included. A blacklist, so an operator this build has never heard of is
   * published rather than silently dropped.
   */
  readonly operators: readonly AgencyID[];
  /** Operators whose replacement buses to leave out, keeping their trains. */
  readonly replacementBuses: readonly AgencyID[];
}

/** Everything published, which is what a build saying nothing about this gets. */
export const NO_EXCLUSIONS: ServiceExclusions = {modes: [], operators: [], replacementBuses: []};

/**
 * The modes by the name a config writes them under. Words rather than the GTFS
 * numbers, because `modes: [1, 3, 4]` is a config nobody can review. The first
 * name for each is the one messages use.
 */
export const MODES: ReadonlyMap<string, RouteType> = new Map([
  ["metro", RouteType.Subway],
  ["subway", RouteType.Subway],
  ["rail", RouteType.Rail],
  ["tram", RouteType.Tram],
  ["bus", RouteType.Bus],
  ["ship", RouteType.Ferry],
  ["ferry", RouteType.Ferry],
  ["replacement-bus", RouteType.ReplacementBus]
]);

/**
 * Drop the schedules the rules name.
 *
 * Applied to the index the overlays produced, so a train that some days is
 * replaced by a service the rules drop has already had those days taken off its
 * calendar. A TUID left with nothing goes with them.
 */
export function excludeServices(schedules: ScheduleIndex, rules: ServiceExclusions): ScheduleIndex {
  if (nothingToDo(rules)) {
    return schedules;
  }

  const modes = new Set(rules.modes);
  const operators = new Set(rules.operators);
  const replacementBuses = new Set(rules.replacementBuses);

  // Every rule that catches it, not the first: the rules overlap - a tube train
  // is both `mode metro` and `operator LT` - and a rule reported as catching
  // nothing because another got there first would be a false alarm.
  const excluded = (schedule: Schedule) => [
    operators.has(schedule.operator) ? `operator ${schedule.operator}` : undefined,
    modes.has(schedule.mode) ? `mode ${modeName(schedule.mode)}` : undefined,
    schedule.mode === RouteType.ReplacementBus && replacementBuses.has(schedule.operator)
      ? `replacement buses of ${schedule.operator}`
      : undefined
  ].filter(rule => rule !== undefined);

  const kept: ScheduleIndex = {};
  const dropped = new Map<string, number>();
  let total = 0;

  for (const [tuid, records] of Object.entries(schedules)) {
    const survivors = records.filter(schedule => {
      const matched = excluded(schedule);

      if (matched.length === 0) {
        return true;
      }

      for (const rule of matched) {
        dropped.set(rule, (dropped.get(rule) ?? 0) + 1);
      }

      total++;

      return false;
    });

    if (survivors.length > 0) {
      kept[tuid] = survivors;
    }
  }

  report(rules, dropped, total);

  return kept;
}

/**
 * What each rule matched, including the rules that matched nothing. The codes
 * are not checked against the operators this build knows, so a rule matching
 * nothing is the only sign of a mistyped one - and a rule that is meant to catch
 * nothing most nights, like an operator that only leaks into the feed
 * occasionally, looks the same and is worth saying either way.
 *
 * The counts can add up to more than the total, because the rules overlap.
 */
function report(rules: ServiceExclusions, dropped: Map<string, number>, total: number): void {
  const counted = [...dropped.entries()]
    .sort(([a], [b]) => a < b ? -1 : 1)
    .map(([rule, count]) => `${rule} (${count})`);

  console.log(`Excluded ${total} schedule(s)${counted.length > 0 ? `, matching ${counted.join(", ")}` : ""}`);

  const idle = every(rules).filter(rule => !dropped.has(rule));

  if (idle.length > 0) {
    console.log(`Nothing matched ${idle.join(", ")} - not in this feed, or not the code it uses.`);
  }
}

/** Every rule as the report names it, so one that caught nothing can be found. */
function every(rules: ServiceExclusions): string[] {
  return [
    ...rules.operators.map(operator => `operator ${operator}`),
    ...rules.modes.map(mode => `mode ${modeName(mode)}`),
    ...rules.replacementBuses.map(operator => `replacement buses of ${operator}`)
  ];
}

function nothingToDo(rules: ServiceExclusions): boolean {
  return rules.modes.length === 0
    && rules.operators.length === 0
    && rules.replacementBuses.length === 0;
}

/** The mode under the name a config writes it, for a message read against the rules. */
function modeName(mode: RouteType): string {
  for (const [name, routeType] of MODES) {
    if (routeType === mode) {
      return name;
    }
  }

  return String(mode);
}
