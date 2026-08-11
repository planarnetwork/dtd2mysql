import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {execFileSync} from "node:child_process";
import {build} from "./build.js";

/**
 * Build the mini fixture and hold it to the MobilityData validator.
 *
 * Any ERROR fails. Warnings and info do not, because the feed has known ones
 * that are either out of our hands or waiting on a ticket - but the set of them
 * is committed, so a new one fails and a fixed one has to be taken off the list.
 * A baseline nobody prunes stops meaning anything.
 *
 *   node dist/validate.js path/to/gtfs-validator.jar
 */
const jar = process.argv[2];
const fixtures = path.join(import.meta.dirname, "..", "fixtures", "mini");
const baselineFile = path.join(fixtures, "validator-baseline.json");

/**
 * The date the fixture is built for, and the date the validator judges it
 * against. Both, or the check drifts: several rules - feed expiry, expired
 * calendars - compare the feed to the real clock, so a fixture pinned to a fixed
 * day starts raising new notices simply because time passed, and one day the
 * whole feed reads as historic. -d pins the validator's today to the feed's.
 */
const TODAY = "2026-08-10";

if (!jar || !fs.existsSync(jar)) {
  throw new Error(`Pass the path to gtfs-validator-<version>-cli.jar. Got ${jar ?? "nothing"}.`);
}

const feed = fs.mkdtempSync(path.join(os.tmpdir(), "validate"));
const out = fs.mkdtempSync(path.join(os.tmpdir(), "validate-report"));

await build([
  "node", "dtd2gtfs", "build",
  "--source", path.join(fixtures, "RJTTF001.ZIP"),
  "--out", feed,
  "--today", TODAY
]);

// -svu because a validator release should not change the result of a pinned run
execFileSync("java", ["-jar", jar, "-i", feed, "-o", out, "-d", TODAY, "-svu"], {stdio: "inherit"});

interface Notice {
  code: string;
  severity: string;
  totalNotices: number;
}

const notices: Notice[] = JSON.parse(fs.readFileSync(path.join(out, "report.json"), "utf8")).notices;
const baseline: string[] = JSON.parse(fs.readFileSync(baselineFile, "utf8")).accepted;

const errors = notices.filter(notice => notice.severity === "ERROR");
const seen = notices.map(notice => notice.code).sort();
const added = seen.filter(code => !baseline.includes(code));
const gone = baseline.filter(code => !seen.includes(code));

for (const notice of notices.sort((a, b) => a.code < b.code ? -1 : 1)) {
  console.log(`${notice.severity.padEnd(8)} ${notice.code.padEnd(45)} ${notice.totalNotices}`);
}

const complaints: string[] = [];

if (errors.length > 0) {
  complaints.push(`${errors.length} validator error(s): ${errors.map(e => e.code).join(", ")}`);
}

if (added.length > 0) {
  complaints.push(
    `${added.length} notice(s) the baseline does not accept: ${added.join(", ")}. ` +
    `Fix them, or add them to ${path.basename(baselineFile)} with a reason.`
  );
}

if (gone.length > 0) {
  complaints.push(
    `${gone.length} accepted notice(s) no longer occur: ${gone.join(", ")}. ` +
    `Take them out of ${path.basename(baselineFile)} so the list keeps meaning something.`
  );
}

if (complaints.length > 0) {
  console.error("\n" + complaints.join("\n"));
  process.exit(1);
}

console.log(`\nNo errors. ${seen.length} accepted notice type(s).`);
