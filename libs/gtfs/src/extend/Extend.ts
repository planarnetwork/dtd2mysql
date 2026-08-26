import {Extension, ExtensionFile, ExtensionReport} from "./Extension";
import {FeedView} from "./FeedView";

/**
 * The files the core build writes itself.
 *
 * An extension naming one of these would either be silently ignored or silently
 * win, depending on which stream was opened last. Both are worse than failing,
 * so it fails.
 */
const CORE_FILES = [
  "agency.txt",
  "calendar.txt",
  "calendar_dates.txt",
  "feed_info.txt",
  "links.txt",
  "provenance.json",
  "routes.txt",
  "stop_times.txt",
  "stops.txt",
  "transfers.txt",
  "trips.txt"
];

/**
 * Fetch everything at once, then build the files.
 *
 * Extensions have no `dependsOn`. An enricher can need another to have run -
 * OSM pathways cannot join platforms NaPTAN has not created - but an extension
 * writes its own files out of the feed and its own data, so there is nothing
 * for one to wait for. If that ever stops being true it wants the ordering
 * `Enrich.order` already does, not a second version of it.
 */
export async function extend(
  feed: FeedView,
  extensions: readonly Extension[]
): Promise<{files: ExtensionFile[], reports: ExtensionReport[]}> {
  // Fetch failures name the extension, for the same reason enrichment does:
  // otherwise a build fails with a timeout from an HTTP client and no
  // indication which source was down.
  const fetched = await Promise.all(extensions.map(async extension => {
    try {
      return await extension.fetch();
    }
    catch (err) {
      throw new Error(`${extension.key} could not fetch its data: ${message(err)}`);
    }
  }));

  const files: ExtensionFile[] = [];
  const reports: ExtensionReport[] = [];
  const claimed = new Map<string, string>();

  for (const [i, extension] of extensions.entries()) {
    const output = extension.files(feed, fetched[i]);

    for (const file of output.files) {
      if (CORE_FILES.includes(file.filename)) {
        throw new Error(
          `${extension.key} wants to write ${file.filename}, which the build writes itself. ` +
          `An extension adds files; it does not replace them.`
        );
      }

      const owner = claimed.get(file.filename);

      if (owner !== undefined) {
        throw new Error(
          `${extension.key} and ${owner} both want to write ${file.filename}. ` +
          `Enable one of them, or give them different files.`
        );
      }

      claimed.set(file.filename, extension.key);
      files.push(file);
    }

    reports.push(output.report);
    console.log(
      `${extension.key}: wrote ${output.report.written}, dropped ${output.report.dropped} ` +
      `(${output.files.map(f => f.filename).join(", ") || "no files"})`
    );

    for (const note of output.report.notes ?? []) {
      console.log(`  ${note}`);
    }
  }

  return {files, reports};
}

/**
 * Two extensions asked for in a config, both calling themselves the same thing.
 *
 * Checked before anything is fetched: a build that has already downloaded a
 * 46 MB fares feed and then finds the collision has wasted the expensive part.
 */
export function checkKeys(extensions: readonly Extension[]): void {
  const seen = new Set<string>();

  for (const extension of extensions) {
    if (seen.has(extension.key)) {
      throw new Error(`Two extensions both call themselves ${extension.key}.`);
    }

    seen.add(extension.key);
  }
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
