import type {Group, Sample, SampleRef} from "../../validation.js";
import {counts} from "../../validation.js";
import type {Route} from "../../route.js";
import {format} from "../../route.js";
import {csvRowNumberOf} from "../../model/FeedIndex.js";
import {number} from "../../format.js";
import {escape} from "../dom.js";
import {PAGE_SIZE} from "./FileTable.js";

/**
 * What a standard validator makes of this feed, and which of it is on purpose.
 *
 * The nightly runs the MobilityData validator and publishes its whole report, held against a
 * baseline naming the errors the build accepts and the reason for each. Nothing has ever shown that
 * report to anybody: it goes up as a release asset and stays there.
 *
 * Showing the notices without the reasons would be worse than not showing them - a wall of errors
 * against a feed that passes its own gate - so an accepted code is presented as a decision, in the
 * words the baseline uses.
 */
export function validationView(
  groups: readonly Group[] | undefined,
  code: string | undefined
): string {
  if (groups === undefined) {
    return `
      <h2 class="h2 h2--sm" tabindex="-1" data-heading>Validation</h2>
      <p class="x-empty">
        This feed has no validator report beside it. The nightly publishes one for the feeds it
        builds; a feed you opened from your own machine has none.
      </p>`;
  }

  const shown = code === undefined ? groups : groups.filter(group => group.code === code);
  const total = counts(groups);

  return `
    <h2 class="h2 h2--sm" tabindex="-1" data-heading>Validation</h2>
    <p class="x-lede">
      ${total.errors === 0
        ? "No unaccepted errors."
        : `${number(total.errors)} error${total.errors === 1 ? "" : "s"}.`}
      ${number(total.warnings)} warnings.
      ${total.accepted === 0
        ? ""
        : `${number(total.accepted)} accepted, each for a reason the build states.`}
    </p>
    <p class="x-note">
      From the MobilityData validator, run against the feed when it was built. An accepted error is
      not a fault that was ignored — it is the feed reporting its source rather than correcting it,
      or a deliberate choice made so that something would flag it.
    </p>
    ${code === undefined ? "" : `<p class="x-tools">
      <a class="x-btn" href="${format({view: "validation"})}">&larr; all the notices</a></p>`}
    <ul class="x-checks">${shown.map(group).join("")}</ul>`;
}

function group(group: Group): string {
  return `<li class="x-check">
    <div class="x-check__head">
      <a class="x-check__title" href="${format({view: "validation", code: group.code})}">
        <code>${escape(group.code)}</code></a>
      <span class="x-pill x-pill--${group.accepted !== undefined
        ? "clear" : group.severity === "ERROR" ? "error" : group.severity === "WARNING" ? "warning" : ""}">
        ${number(group.total)} ${escape(group.severity.toLowerCase())}${group.total === 1 ? "" : "s"}
      </span>
    </div>
    ${group.accepted === undefined
      ? ""
      : `<p class="x-note x-accepted">
          Accepted, up to ${number(group.accepted.max)}. ${escape(group.accepted.why)}</p>`}
    ${group.shown < group.total
      ? `<p class="x-note">The report holds ${number(group.shown)} of the
        ${number(group.total)}.</p>`
      : ""}
    ${group.samples.length === 0 ? "" : samples(group.samples)}
  </li>`;
}

function samples(samples: readonly Sample[]): string {
  return `<ul class="x-findings">${samples.slice(0, 12).map(sample => `<li class="x-finding">
    <code>${escape(describe(sample.fields))}</code>
    ${sample.refs.map(ref => `<a href="${link(ref)}">${label(ref)}&nearr;</a>`).join(" ")}
  </li>`).join("")}</ul>`;
}

/** A notice's fields, as it carries them. There is no schema for these, so they are shown as they are. */
function describe(fields: Readonly<Record<string, unknown>>): string {
  return Object.entries(fields)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([field, value]) => `${field}=${String(value)}`)
    .join(" ");
}

function link(ref: SampleRef): string {
  if (ref.kind === "row") {
    return `${format({
      view: "file",
      file: ref.file,
      page: Math.floor(ref.row / PAGE_SIZE),
      filters: {}
    } as Route)}#row-${csvRowNumberOf(ref.row)}`;
  }

  return format({view: ref.kind, id: ref.id} as Route);
}

function label(ref: SampleRef): string {
  return ref.kind === "row" ? `${escape(ref.file)} row ${csvRowNumberOf(ref.row)}` : ref.kind;
}
