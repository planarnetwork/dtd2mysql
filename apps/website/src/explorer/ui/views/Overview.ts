import type {FeedManifest} from "../../model/FeedIndex.js";
import {bytes, number} from "../../format.js";
import {escape} from "../dom.js";

/**
 * What is in this zip.
 *
 * The first question anybody has, and the one that catches a missing file or an unexpected column
 * before they have gone looking for anything. Every file's real header is compared with the one the
 * standard describes, so a feed that carries an extra column says so rather than hiding it.
 */
export function overview(manifest: FeedManifest): string {
  const rows = manifest.files.map(file => `<tr>
      <th scope="row"><a href="#/file/${encodeURIComponent(file.name)}">${escape(file.name)}</a></th>
      <td class="num">${number(file.rows)}</td>
      <td class="num">${file.originalSize === undefined ? "" : bytes(file.originalSize)}</td>
      <td class="num">${file.compressedSize === undefined ? "" : bytes(file.compressedSize)}</td>
      <td>${columns(file.header.length, file.unknown, file.missing, file.notHeld)}</td>
    </tr>`).join("");

  const other = manifest.other.length === 0 ? "" : `
    <p class="note">The zip also holds ${manifest.other.map(name =>
      `<code>${escape(name)}</code>`).join(", ")}, which ${manifest.other.length === 1
        ? "is not a file a feed is made of" : "are not files a feed is made of"}.</p>`;

  return `
    <h2 class="h h1" tabindex="-1" data-heading>What is in ${escape(manifest.name)}</h2>
    <p class="lede">
      Every file the zip holds, the shape it actually has, and how it compares with what the
      standard describes.
    </p>
    <div class="scroll">
      <table class="list">
        <thead>
          <tr>
            <th scope="col">File</th>
            <th scope="col" class="num">Rows</th>
            <th scope="col" class="num">Size</th>
            <th scope="col" class="num">Packed</th>
            <th scope="col">Columns</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    ${other}`;
}

/**
 * What a file's columns are, and how they differ from what was expected.
 *
 * A count on its own says nothing. The difference is the whole point: an extra column is a producer
 * saying something the standard has no room for, and a missing one is something a reader may be
 * about to look for and not find.
 */
function columns(
  count: number,
  unknown: readonly string[],
  missing: readonly string[],
  notHeld: readonly string[]
): string {
  const parts = [`${count}`];

  if (unknown.length > 0) {
    parts.push(`<span class="tag tag--extra">${unknown.length} beyond the standard: `
      + `${unknown.map(escape).join(", ")}</span>`);
  }
  if (missing.length > 0) {
    parts.push(`<span class="tag">${missing.length} not carried: `
      + `${missing.map(escape).join(", ")}</span>`);
  }
  if (notHeld.length > 0) {
    parts.push(`<span class="tag" title="read from the zip when something asks for it">`
      + `${notHeld.map(escape).join(", ")} read on demand</span>`);
  }

  return parts.join(" ");
}
