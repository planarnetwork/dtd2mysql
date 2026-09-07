import {execFileSync} from "node:child_process";

/**
 * Every baseline a branch moves has to be explained.
 *
 * A baseline records current behaviour, so changing one is normal - but it has
 * to be a decision. Without this a golden can be regenerated and committed
 * without anybody reading the diff, which is the only thing that makes it worth
 * committing as text at all.
 *
 *   node scripts/check-baselines.mjs <base-sha>
 *
 * With no base, there is nothing to compare against and it passes: that is a
 * push to master rather than a pull request.
 */

/**
 * What counts as a baseline.
 */
const BASELINES = [
  "apps/*/fixtures/*/golden/**",
  "apps/*/fixtures/validator-baseline.json",
  "type-surface.json",
  ".github/validator-baseline*.json"
];

const EXPLANATIONS = "apps/*/fixtures/BASELINE.md";

/**
 * Which BASELINE.md answers for a changed file.
 *
 * Each app answers for its own golden: accepting an entry in any of them would
 * let a note about the bus feed excuse a change to the rail one. Everything
 * else - the type surface, the release baselines - is repository wide, so any
 * entry will do.
 */
export function explainedBy(file) {
  const app = /^(apps\/[^/]+)\/fixtures\//.exec(file);

  return app === null ? null : `${app[1]}/fixtures/BASELINE.md`;
}

/**
 * The files a branch changed that need explaining, and whether they were.
 */
export function unexplained(changed, explained) {
  const entries = new Set(explained);

  return changed.filter(file => {
    const required = explainedBy(file);

    return required === null ? entries.size === 0 : !entries.has(required);
  });
}

export function report(changed, explained) {
  if (changed.length === 0) {
    return 0;
  }

  console.log("Baselines changed:");

  for (const file of changed) {
    console.log(`  ${file}`);
  }

  const missing = unexplained(changed, explained);

  if (missing.length === 0) {
    return 0;
  }

  console.error("");

  for (const file of missing) {
    const required = explainedBy(file) ?? "any apps/*/fixtures/BASELINE.md";

    console.error(`${file} changed with no entry in ${required}.`);
  }

  console.error("\nSay which ticket moved it and what the diff shows.");

  return 1;
}

function changedFiles(base, paths) {
  const out = execFileSync(
    "git",
    ["diff", "--name-only", `${base}...HEAD`, "--", ...paths],
    {encoding: "utf8"}
  );

  return out.split("\n").filter(line => line !== "");
}

if (import.meta.filename === process.argv[1]) {
  const base = process.argv[2];

  if (!base) {
    // A push to master, so there is no branch point to compare against.
    process.exit(0);
  }

  try {
    execFileSync("git", ["fetch", "-q", "--depth=1", "origin", base], {stdio: "ignore"});
  }
  catch {
    // Already have it, or cannot reach the remote. The diff below says which.
  }

  process.exit(report(changedFiles(base, BASELINES), changedFiles(base, [EXPLANATIONS])));
}
