import {execFileSync} from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import {fileURLToPath} from "node:url";

/**
 * Publish the workspace in the current directory, unless it is already out.
 *
 * `yarn release` walks every non-private workspace, but a changeset only bumps
 * the packages it names. Everything else keeps the version it was published
 * under, and `npm publish` refuses to publish over that - so one unchanged
 * package fails the whole release, and the packages that did change never get
 * as far as being attempted. That is what took releases 8.0.2 and 9.0.0 out:
 * @gb-transit/feed-parser sorts first topologically and had nothing to say.
 *
 * So an already-published version is a skip rather than a failure. A release
 * where every package is current is then a no-op that exits 0, which is the
 * honest answer to "publish a commit that changed no package".
 *
 * The registry is asked rather than trusted from a lockfile or a changelog,
 * because the only thing that can say what is on npm is npm.
 */

/**
 * Read the outcome of `npm view <name>@<version> version`.
 *
 * A missing version and an unreachable registry both exit non-zero, and telling
 * them apart is the whole point: E404 means there is room to publish, anything
 * else means we do not know. Guessing "publish" on an outage would turn a
 * network blip into a half-released monorepo.
 */
export function registryVerdict({status, stdout, stderr}) {
  if (status === 0 && stdout.trim() !== "") {
    return "published";
  }

  if (/\bE404\b/.test(stderr)) {
    return "absent";
  }

  throw new Error(`Cannot tell whether this version is published:\n${stderr.trim() || stdout.trim()}`);
}

function lookUp(name, version) {
  const result = execFileSync("npm", ["view", `${name}@${version}`, "version"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  return {status: 0, stdout: result, stderr: ""};
}

function lookUpTolerantly(name, version) {
  try {
    return lookUp(name, version);
  }
  catch (error) {
    return {status: error.status ?? 1, stdout: error.stdout ?? "", stderr: error.stderr ?? String(error)};
  }
}

function run(command, args) {
  execFileSync(command, args, {stdio: "inherit"});
}

/**
 * Pack with yarn and upload with npm.
 *
 * yarn pack resolves the workspace: ranges the packages depend on each other
 * through into the versions they were bumped to; npm publish is what supports
 * trusted publishing over OIDC. Neither tool does both.
 */
function publish() {
  run("yarn", ["pack", "--out", "package.tgz"]);

  try {
    run("npm", ["publish", "package.tgz"]);
  }
  finally {
    fs.rmSync("package.tgz", {force: true});
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const {name, version} = JSON.parse(fs.readFileSync("package.json", "utf8"));

  if (registryVerdict(lookUpTolerantly(name, version)) === "published") {
    console.log(`${name}@${version} is already published, skipping`);
  }
  else {
    console.log(`Publishing ${name}@${version}`);
    publish();
  }
}
