import type {FeedIndex} from "../model/FeedIndex.js";
import type {Calendars} from "../model/Calendar.js";
import type {Links} from "../model/Links.js";

export type Severity = "error" | "warning" | "note";

/**
 * Where to go and look, which is what turns a finding into a link.
 *
 * A finding nobody can follow is a sentence about a feed rather than a way into it.
 */
export type Reference =
  | {kind: "stop", id: string}
  | {kind: "trip", id: string}
  | {kind: "route", id: string}
  | {kind: "service", id: string}
  | {kind: "row", file: string, row: number};

export interface Finding {
  readonly check: string;
  readonly severity: Severity;
  readonly message: string;
  readonly ref?: Reference;
}

/** What a check is given: the feed, plus the two indexes several of them would otherwise rebuild. */
export interface CheckContext {
  readonly feed: FeedIndex;
  readonly calendars: Calendars;
  readonly links: Links;
}

export interface Check {
  /** Stable: it is in the URL and in the issue links people paste. Do not rename one. */
  readonly id: string;
  readonly title: string;
  /** The question this answers, in the site's voice, shown above the findings. */
  readonly question: string;
  /** A check whose file the feed does not have is skipped, not failed. */
  readonly files: readonly string[];
  /** Whether it needs the second phase loaded. */
  readonly needsCalls: boolean;
  run(context: CheckContext, report: (finding: Omit<Finding, "check">) => void): void;
}

export interface CheckResult {
  readonly check: string;
  readonly title: string;
  readonly question: string;
  readonly status: "ran" | "skipped";
  /** Why it was skipped, said rather than left blank. */
  readonly why?: string;
  readonly findings: number;
}

/**
 * Run a check, or say why it did not run.
 *
 * A check that cannot run is reported as skipped rather than as passing. A feed with no
 * calendar.txt has not passed the calendar checks, and a page that showed a tick against them would
 * be telling its reader something false.
 */
export function runCheck(
  check: Check,
  context: CheckContext,
  report: (finding: Finding) => void
): CheckResult {
  const missing = check.files.filter(file => !context.feed.files.has(file)
    && !(file === "stop_times.txt" && context.feed.calls !== undefined));

  const described = {check: check.id, title: check.title, question: check.question};

  if (missing.length > 0) {
    return {
      ...described,
      status: "skipped",
      why: `The feed has no ${missing.join(" or ")}.`,
      findings: 0
    };
  }

  if (check.needsCalls && context.feed.calls === undefined) {
    return {
      ...described,
      status: "skipped",
      why: "The calls have not been loaded.",
      findings: 0
    };
  }

  let findings = 0;

  check.run(context, finding => {
    findings++;
    report({...finding, check: check.id});
  });

  return {...described, status: "ran", findings};
}
