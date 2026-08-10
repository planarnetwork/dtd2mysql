import * as fs from "node:fs";
import * as path from "node:path";

/**
 * A DTD timetable feed file: RJTTF918.ZIP is a full refresh, RJTTC919.ZIP an
 * incremental. The sequence number runs across both, so ordering by it is not
 * the same as ordering by filename - sorted as text, every C sorts before every
 * F and the refresh ends up last.
 *
 * The other three feeds are named the same way (RJFA, RJRG) and live in the same
 * directory, so the prefix is part of the match.
 */
const TIMETABLE_FEED = /^RJTT([FC])(\d+)\.zip$/i;

interface FeedFile {
  readonly path: string;
  readonly sequence: number;
  readonly refresh: boolean;
}

/**
 * Expand what was given on the command line into the feeds to apply, in the
 * order to apply them.
 *
 * A path to a file is taken as given. A path to a directory contributes every
 * timetable feed in it, ordered by sequence number and starting at the most
 * recent full refresh - anything before that refresh is superseded by it, and a
 * directory that feeds are downloaded into accumulates more than one cycle.
 */
export function timetableFeeds(sources: string[]): string[] {
  return sources.flatMap(source => {
    if (!fs.existsSync(source)) {
      throw new Error(`Source ${source} does not exist.`);
    }

    if (fs.statSync(source).isDirectory()) {
      return feedsIn(source);
    }

    if (!TIMETABLE_FEED.test(path.basename(source))) {
      throw new Error(
        `${source} is not a timetable feed. Expected a file named RJTTFxxx.ZIP or RJTTCxxx.ZIP - ` +
        `the fares, routeing and NFM64 feeds are named the same way but hold different files.`
      );
    }

    return [source];
  });
}

function feedsIn(directory: string): string[] {
  const feeds: FeedFile[] = [];

  for (const entry of fs.readdirSync(directory)) {
    const parsed = TIMETABLE_FEED.exec(entry);

    if (parsed) {
      feeds.push({
        path: path.join(directory, entry),
        sequence: parseInt(parsed[2], 10),
        refresh: parsed[1].toUpperCase() === "F"
      });
    }
  }

  feeds.sort((a, b) => a.sequence - b.sequence || a.path.localeCompare(b.path));

  const lastRefresh = feeds.findLastIndex(feed => feed.refresh);

  return feeds.slice(lastRefresh === -1 ? 0 : lastRefresh).map(feed => feed.path);
}
