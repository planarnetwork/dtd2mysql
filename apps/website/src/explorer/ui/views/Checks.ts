import type {CheckResult, Finding, Reference} from "../../checks/Check.js";
import {CHECK_GROUPS} from "../../checks/checks.js";
import {format} from "../../route.js";
import type {Route} from "../../route.js";
import {csvRowNumberOf} from "../../model/FeedIndex.js";
import {number} from "../../format.js";
import {escape} from "../dom.js";

/**
 * Everything the explorer knows how to ask about a feed, and what it found.
 *
 * The value of a registry is that a question answered once stays answered. Somebody works out why a
 * station was in the wrong place, the check that would have caught it goes in the list, and nobody
 * has to work it out again.
 */
export function checksView(
  results: readonly CheckResult[],
  findings: readonly Finding[],
  running: boolean
): string {
  const byCheck = new Map<string, Finding[]>();

  for (const finding of findings) {
    byCheck.set(finding.check, [...(byCheck.get(finding.check) ?? []), finding]);
  }

  const groups = CHECK_GROUPS.map(group => {
    const rows = group.checks.map(check => {
      const result = results.find(found => found.check === check.id);
      const found = byCheck.get(check.id) ?? [];

      return `<li class="check">
        <div class="check__head">
          <a class="check__title" href="${format({view: "checks", id: check.id})}">
            ${escape(check.title)}</a>
          ${status(result, found)}
        </div>
        <p class="check__q">${escape(check.question)}</p>
        ${result?.status === "skipped"
          ? `<p class="note">Not run. ${escape(result.why ?? "")}</p>`
          : ""}
        ${found.length === 0 ? "" : findingList(found.slice(0, 20), found.length)}
      </li>`;
    }).join("");

    return `<section class="group">
      <h3 class="h h2">${escape(group.title)}</h3>
      <p class="note">${escape(group.blurb)}</p>
      <ul class="checks">${rows}</ul>
    </section>`;
  }).join("");

  const errors = findings.filter(finding => finding.severity === "error").length;
  const warnings = findings.filter(finding => finding.severity === "warning").length;

  return `
    <h2 class="h h1" tabindex="-1" data-heading>Checks</h2>
    <p class="lede" aria-live="polite">
      ${running
        ? "Running…"
        : `${number(errors)} error${errors === 1 ? "" : "s"} and `
          + `${number(warnings)} warning${warnings === 1 ? "" : "s"} across `
          + `${number(results.filter(result => result.status === "ran").length)} checks.`}
    </p>
    <p class="note">
      A finding is not always a fault. Some of these are the feed reporting its source honestly
      rather than correcting it, and a couple are deliberate — a stop published at 0,0 is there so
      that something will flag it rather than hiding behind a plausible guess.
    </p>
    ${groups}`;
}

function status(result: CheckResult | undefined, findings: readonly Finding[]): string {
  if (result === undefined) {
    return "<span class=\"pill\">waiting</span>";
  }
  if (result.status === "skipped") {
    return "<span class=\"pill\">not run</span>";
  }
  if (findings.length === 0) {
    return "<span class=\"pill pill--clear\">nothing found</span>";
  }

  const worst = findings.some(finding => finding.severity === "error")
    ? "error"
    : findings.some(finding => finding.severity === "warning") ? "warning" : "note";

  return `<span class="pill pill--${worst}">${number(findings.length)} `
    + `${worst === "note" ? "to note" : worst === "error" ? "to fix" : "to look at"}</span>`;
}

function findingList(findings: readonly Finding[], total: number): string {
  const items = findings.map(finding => `<li class="finding finding--${finding.severity}">
    ${escape(finding.message)}
    ${finding.ref === undefined ? "" : `<a href="${link(finding.ref)}">look&nearr;</a>`}
  </li>`).join("");

  return `<ul class="findings">${items}</ul>${total > findings.length
    ? `<p class="note">and ${number(total - findings.length)} more.</p>`
    : ""}`;
}

/** A finding nobody can follow is a sentence about a feed rather than a way into it. */
function link(ref: Reference): string {
  if (ref.kind === "row") {
    return format({
      view: "file",
      file: ref.file,
      page: Math.floor(ref.row / 200),
      filters: {}
    } as Route) + `#row-${csvRowNumberOf(ref.row)}`;
  }

  return format({view: ref.kind, id: ref.id} as Route);
}
