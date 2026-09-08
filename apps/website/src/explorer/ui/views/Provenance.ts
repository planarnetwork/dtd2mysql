import type {FieldHistory, ProvenanceFile} from "../../provenance.js";
import {format} from "../../route.js";
import {number} from "../../format.js";
import {escape} from "../dom.js";

/** How many entries the table shows. The stop view is where a single answer is actually looked up. */
const SHOWN = 500;

/**
 * The whole enrichment ledger.
 *
 * Mostly here so the file can be seen at all — the question "why does this station say that" is
 * asked on the station, where the stop view answers it. What this adds is the other direction: how
 * much each source contributed, and whether any two of them are fighting.
 */
export function provenanceView(file: ProvenanceFile | undefined): string {
  if (file === undefined) {
    return `
      <h2 class="h2 h2--sm" tabindex="-1" data-heading>Where the feed's values came from</h2>
      <p class="x-empty">
        This feed has no ledger beside it. The nightly publishes one for the feeds it builds; a feed
        you opened from your own machine has none.
      </p>`;
  }

  const contested = file.fields.filter(field => field.overruled.length > 0);

  return `
    <h2 class="h2 h2--sm" tabindex="-1" data-heading>Where the feed's values came from</h2>
    <p class="x-lede">
      ${number(file.fields.length)} values were written by a source rather than taken from the
      timetable. ${contested.length === 0
        ? "None of them was contested."
        : `${number(contested.length)} of them overruled another source.`}
    </p>
    <p class="x-note">
      This is the answer to &ldquo;why does the feed say that&rdquo;. It is asked on a station, where
      the stop view shows only that station's entries — this is the whole of it.
    </p>

    ${file.conflicts === 0
      ? ""
      : `<p class="x-warn">${number(file.conflicts)} fields were written by two sources at the same
        priority, so which one won was settled arbitrarily. That is a decision somebody has to
        make.</p>`}

    <h3 class="x-h3">The sources</h3>
    <div class="x-scroll">
      <table class="x-table">
        <thead><tr>
          <th scope="col">source</th><th scope="col" class="x-num">matched</th>
          <th scope="col" class="x-num">unmatched</th><th scope="col" class="x-num">conflicts</th>
        </tr></thead>
        <tbody>${file.enrichers.map(enricher => `<tr>
          <th scope="row">${escape(enricher.id)}</th>
          <td class="x-num">${number(enricher.matched)}</td>
          <td class="x-num">${number(enricher.unmatched)}</td>
          <td class="x-num">${number(enricher.conflicts)}</td>
        </tr>`).join("")}</tbody>
      </table>
    </div>

    ${contested.length === 0 ? "" : `
      <h3 class="x-h3">Where sources disagreed</h3>
      ${table(contested.slice(0, SHOWN), contested.length)}`}

    <h3 class="x-h3">Everything written</h3>
    ${table(file.fields.slice(0, SHOWN), file.fields.length)}`;
}

function table(fields: readonly FieldHistory[], total: number): string {
  return `<div class="x-scroll">
      <table class="x-table">
        <thead><tr>
          <th scope="col">what</th><th scope="col">field</th><th scope="col">value</th>
          <th scope="col">written by</th><th scope="col">overruled</th>
        </tr></thead>
        <tbody>${fields.map(field => `<tr>
          <th scope="row">${field.entity === "stop"
            ? `<a href="${format({view: "stop", id: field.id})}">${escape(field.id)}</a>`
            : escape(field.id)}</th>
          <td>${escape(field.field)}</td>
          <td>${escape(String(field.value))}</td>
          <td>${escape(field.by)}</td>
          <td>${field.overruled.length === 0
            ? "<span class=\"x-absent\">—</span>"
            : field.overruled.map(write =>
              `${escape(write.enricher)}: ${escape(String(write.value))}`).join("<br>")}</td>
        </tr>`).join("")}</tbody>
      </table>
    </div>
    ${total > fields.length
      ? `<p class="x-note">Showing ${number(fields.length)} of ${number(total)}.</p>`
      : ""}`;
}
