import type {StopDetail} from "../../worker/Detail.js";
import type {FieldHistory} from "../../provenance.js";
import {format} from "../../route.js";
import {locationOf, number, transferOf} from "../../format.js";
import {cell, escape} from "../dom.js";
import {plot} from "../Plot.js";

/**
 * A station, and everything the feed says about it.
 *
 * The highest-value view here. "Why is this station in the wrong place" and "why is it called that"
 * are the two most common questions about this data, and both are answered by putting the row, the
 * boarding points under it, and the enrichment ledger on one page - which nothing has ever done,
 * even though the build has published the ledger on every release for months.
 */
export function stopView(detail: StopDetail, date: number | undefined): string {
  if (detail.row === undefined) {
    return `
      <h2 class="h h1" tabindex="-1" data-heading>${escape(detail.id)}</h2>
      <p class="empty">stops.txt has no such stop. Something naming it is naming a stop that
        does not exist, which the integrity checks would report.</p>`;
  }

  const row = detail.row;
  const name = row.stop_name ?? detail.id;
  const isStation = row.location_type === "1";

  return `
    <h2 class="h h1" tabindex="-1" data-heading>${escape(name)}</h2>
    <p class="lede">
      ${escape(detail.id)}${row.stop_code === undefined ? "" : ` &middot; ${escape(row.stop_code)}`}
      &middot; ${locationOf(row.location_type)}
      ${detail.calls === undefined
        ? ""
        : ` &middot; ${number(detail.calls + (detail.childCalls ?? 0))} calls`}
    </p>

    <div class="split">
      <div>
        ${fields(detail)}
        ${date === undefined || !isStation ? "" : `<p class="tools">
          <a class="btn2 btn2--go" href="${format({view: "board", id: detail.id, date})}">
            See what departs here &rarr;</a></p>`}
      </div>
      ${plot(detail)}
    </div>

    ${children(detail)}
    ${provenance(detail.provenance)}
    ${transfers(detail)}`;
}

function fields(detail: StopDetail): string {
  const row = detail.row!;
  const shown = ["stop_id", "stop_code", "stop_name", "stop_desc", "location_type", "parent_station",
    "platform_code", "stop_lat", "stop_lon", "zone_id", "stop_timezone", "wheelchair_boarding",
    "stop_url"];
  const rest = Object.keys(row).filter(column => !shown.includes(column));

  const line = (column: string) => {
    const value = row[column];

    if (value === undefined && !["stop_lat", "stop_lon", "parent_station"].includes(column)) {
      return "";
    }

    const rendered = column === "parent_station" && value !== undefined && value !== ""
      ? `<a href="${format({view: "stop", id: value})}">${escape(value)}</a>`
      : cell(value);

    return `<div class="field"><dt>${escape(column)}</dt><dd>${rendered}</dd></div>`;
  };

  return `<dl class="fields">${[...shown, ...rest].map(line).join("")}</dl>`;
}

/**
 * The boarding points under a station.
 *
 * The distance from the station is here rather than hidden in a check because it is the visible
 * symptom of the ordering the feed build has to get right: boarding points are built after
 * enrichment, so a platform can keep the coordinate it had while its station gets a better one.
 */
function children(detail: StopDetail): string {
  if (detail.children.length === 0) {
    return "";
  }

  const rows = detail.children.map(child => `<tr>
      <th scope="row"><a href="${format({view: "stop", id: child.row.stop_id as string})}">
        ${escape(child.row.stop_id)}</a></th>
      <td>${cell(child.row.stop_name)}</td>
      <td>${cell(child.row.platform_code)}</td>
      <td class="num">${cell(child.row.stop_lat)}, ${cell(child.row.stop_lon)}</td>
      <td class="num">${child.metresFromParent === undefined
        ? ""
        : `<span${child.metresFromParent > 100 ? " class=\"warn-inline\"" : ""}>`
          + `${number(child.metresFromParent)} m</span>`}</td>
    </tr>`).join("");

  return `
    <h3 class="h h2">Boarding points here</h3>
    <p class="note">Every call in this feed is at one of these, not at the station itself.</p>
    <div class="scroll">
      <table class="list">
        <thead><tr>
          <th scope="col">stop_id</th><th scope="col">name</th><th scope="col">platform</th>
          <th scope="col" class="num">position</th>
          <th scope="col" class="num">from the station</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

/**
 * Who wrote what, and who was overruled.
 *
 * The ledger the nightly publishes as provenance.json, which exists precisely because "the
 * coordinate is wrong" is unanswerable without it. Left out entirely when the release carried none,
 * rather than rendered as an empty table.
 */
function provenance(fields: readonly FieldHistory[]): string {
  if (fields.length === 0) {
    return "";
  }

  const rows = fields.map(field => `<tr>
      <th scope="row">${escape(field.field)}</th>
      <td>${escape(String(field.value))}</td>
      <td>${escape(field.by)}</td>
      <td>${field.overruled.length === 0
        ? "<span class=\"absent\">nobody disagreed</span>"
        : field.overruled.map(write =>
          `${escape(write.enricher)} said ${escape(String(write.value))} `
          + `<span class="note">(priority ${write.priority})</span>`).join("<br>")}</td>
    </tr>`).join("");

  return `
    <h3 class="h h2">Where this came from</h3>
    <p class="note">
      What the sources wrote here, and what they overruled. This is the answer to
      &ldquo;why does the feed say that&rdquo;.
    </p>
    <div class="scroll">
      <table class="list">
        <thead><tr>
          <th scope="col">field</th><th scope="col">value</th>
          <th scope="col">written by</th><th scope="col">overruled</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function transfers(detail: StopDetail): string {
  if (detail.transfers.length === 0 && detail.links.length === 0) {
    return "";
  }

  const rows = detail.transfers.map(row => `<tr>
      <td><a href="${format({view: "stop", id: row.from_stop_id as string})}">
        ${escape(row.from_stop_id)}</a></td>
      <td><a href="${format({view: "stop", id: row.to_stop_id as string})}">
        ${escape(row.to_stop_id)}</a></td>
      <td>${transferOf(row.transfer_type)}</td>
      <td class="num">${cell(row.min_transfer_time)}</td>
      <td>${cell(row.mode)}</td>
    </tr>`).join("");

  return `
    <h3 class="h h2">Getting to and from here</h3>
    <div class="scroll">
      <table class="list">
        <thead><tr>
          <th scope="col">from</th><th scope="col">to</th><th scope="col">kind</th>
          <th scope="col" class="num">seconds</th><th scope="col">by</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}
