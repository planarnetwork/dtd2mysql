/**
 * The validator report the nightly publishes beside the feed.
 *
 * This is the MobilityData validator's own report.json, held against a baseline that names the
 * errors the build accepts and why. Both halves matter here: the notices say what a standard
 * validator makes of the feed, and the baseline says which of those are decisions rather than
 * faults - a stop published at 0,0 is there precisely so that a validator will flag it.
 *
 * A page that showed the notices without the reasons would be a list of failures for a feed that
 * passes, which is worse than not showing them.
 */

export interface Notice {
  readonly code: string;
  readonly severity: "ERROR" | "WARNING" | "INFO" | string;
  readonly totalNotices: number;
  readonly sampleNotices: readonly Record<string, unknown>[];
}

export interface Report {
  readonly notices: readonly Notice[];
}

/** An entry of .github/validator-baseline.json: an accepted error, and the reason it is accepted. */
export interface Accepted {
  readonly max: number;
  readonly why: string;
}

export type Baseline = Readonly<Record<string, Accepted>>;

export interface Group {
  readonly code: string;
  readonly severity: string;
  readonly total: number;
  /** How many of the total the report actually carries. It samples rather than listing everything. */
  readonly shown: number;
  readonly samples: readonly Sample[];
  /** Set when the build accepts this code, with the reason it gives. */
  readonly accepted?: Accepted;
}

export interface Sample {
  readonly fields: Readonly<Record<string, unknown>>;
  /** Things named in the sample that the explorer can open. */
  readonly refs: readonly SampleRef[];
}

export type EntityKind = "stop" | "trip" | "route" | "service";

export type SampleRef =
  | {kind: EntityKind, id: string}
  | {kind: "row", file: string, row: number};

/**
 * Fields a notice uses to name something, and what it names.
 *
 * Matched on the field name because the validator has no schema for these - each notice type carries
 * whatever fields it needs. Anything not listed is shown as itself rather than guessed at.
 */
const NAMES: Record<string, EntityKind> = {
  stopId: "stop",
  parentStation: "stop",
  fromStopId: "stop",
  toStopId: "stop",
  tripId: "trip",
  fromTripId: "trip",
  toTripId: "trip",
  routeId: "route",
  serviceId: "service"
};

export function groups(report: Report, baseline: Baseline): Group[] {
  return [...report.notices]
    .map(notice => ({
      code: notice.code,
      severity: notice.severity,
      total: notice.totalNotices,
      shown: notice.sampleNotices?.length ?? 0,
      samples: (notice.sampleNotices ?? []).map(sample => ({
        fields: sample,
        refs: refsOf(sample)
      })),
      ...(baseline[notice.code] === undefined ? {} : {accepted: baseline[notice.code]})
    }))
    // Errors first, then by how many there are: the biggest thing a reader can act on, at the top.
    .sort((a, b) => rank(a.severity) - rank(b.severity) || b.total - a.total);
}

/**
 * What a sample notice names that can be opened.
 *
 * This is what turns the report from a list of complaints into a way in: a notice about a trip
 * becomes a link to the trip, and one that carries a csvRowNumber becomes a link to that exact row
 * of that exact file.
 */
export function refsOf(sample: Record<string, unknown>): SampleRef[] {
  const refs: SampleRef[] = [];

  for (const [field, kind] of Object.entries(NAMES)) {
    const value = sample[field];

    if (typeof value === "string" && value.length > 0) {
      refs.push({kind, id: value});
    }
  }

  const file = sample.filename;
  const row = sample.csvRowNumber;

  if (typeof file === "string" && typeof row === "number") {
    refs.push({kind: "row", file, row: row - 2});
  }

  return refs;
}

export function counts(groups: readonly Group[]): {errors: number, warnings: number, accepted: number} {
  return {
    errors: groups.filter(group => group.severity === "ERROR" && group.accepted === undefined)
      .reduce((total, group) => total + group.total, 0),
    warnings: groups.filter(group => group.severity === "WARNING")
      .reduce((total, group) => total + group.total, 0),
    accepted: groups.filter(group => group.accepted !== undefined)
      .reduce((total, group) => total + group.total, 0)
  };
}

export function readReport(json: unknown): Report | undefined {
  return json !== null && typeof json === "object" && Array.isArray((json as Report).notices)
    ? json as Report
    : undefined;
}

function rank(severity: string): number {
  return severity === "ERROR" ? 0 : severity === "WARNING" ? 1 : 2;
}
