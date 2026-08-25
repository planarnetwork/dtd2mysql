import * as fs from "node:fs";

/**
 * Hold the validator report to validator-baseline.json.
 *
 * "Any ERROR stops the release" cannot be the rule, because two of them are
 * decisions: B10 publishes an unlocated stop at 0,0 so that a validator flags
 * it, and B24/B25 are closed as source data the feed reports rather than
 * corrects. A gate that can never pass is a gate somebody turns off.
 *
 * So the baseline names the errors that are accepted and how many of each. An
 * unlisted code fails, and so does a listed one that grew - an accepted error
 * is a known quantity, not a licence for more of the same. Fewer than the
 * baseline allows is reported rather than accepted silently, because that is
 * the moment to tighten it.
 */
const report = JSON.parse(fs.readFileSync("report/report.json", "utf8"));
const baseline = JSON.parse(fs.readFileSync("validator-baseline.json", "utf8"));

const errors = report.notices.filter(notice => notice.severity === "ERROR");
const counted = new Map(errors.map(error => [error.code, error.totalNotices]));

const unlisted = [...counted].filter(([code]) => !baseline.hasOwnProperty(code));
const grown = [...counted].filter(([code, count]) => baseline[code] && count > baseline[code].max);
const shrunk = Object.entries(baseline).filter(([code, {max}]) => (counted.get(code) ?? 0) < max);

for (const [code, count] of counted) {
  console.log(`${code} ${count}${baseline[code] ? ` (baseline ${baseline[code].max})` : ""}`);
}

for (const [code, count] of unlisted) {
  console.error(`\n${code}: ${count}, and validator-baseline.json does not accept it.`);
  console.error("Fix it, or add it to the baseline with the reason it is acceptable.");
}

for (const [code, count] of grown) {
  console.error(`\n${code}: ${count}, but the baseline allows ${baseline[code].max}.`);
  console.error(`Accepted because: ${baseline[code].why}`);
  console.error("More of an accepted error is not accepted. Something changed.");
}

for (const [code, {max}] of shrunk) {
  console.log(`\n${code}: ${counted.get(code) ?? 0}, below the baseline of ${max}.`);
  console.log("Lower validator-baseline.json to keep it from coming back.");
}

fs.writeFileSync("feed/validation.json", JSON.stringify(report, null, 2));

if (unlisted.length > 0 || grown.length > 0) {
  console.error("\nThe feed will not be released.");
  process.exit(1);
}
