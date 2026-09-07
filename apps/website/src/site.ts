/**
 * Where this repository is, and where the things it publishes are.
 *
 * The repository was renamed from dtd2mysql to gb-transit after the site was
 * first written, and the old name was spelled out in a dozen places across the
 * pages. It is spelled out once here now, so the next rename is a one line
 * change rather than an archaeology exercise.
 */
export const OWNER = "planarnetwork";
export const REPO = "gb-transit";

export const GITHUB = `https://github.com/${OWNER}/${REPO}`;
export const ORG = `https://github.com/${OWNER}`;

/**
 * A release asset by name. `latest` always resolves to the most recent release,
 * which is what makes these links bookmarkable and scriptable - the promise the
 * download page makes.
 */
export const RELEASE = `${GITHUB}/releases/latest/download`;

/** A file in the repository, on the default branch. */
export function source(path: string): string {
  return `${GITHUB}/blob/master/${path}`;
}

/** A package on npm, for the tools this repository publishes. */
export function npm(name: string): string {
  return `https://www.npmjs.com/package/${name}`;
}
