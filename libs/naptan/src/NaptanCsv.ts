import * as fs from "node:fs";
import * as path from "node:path";

/**
 * The DfT's open data endpoint. `stopTypes` is accepted and ignored - the
 * response is the whole national dataset, around 100 MB - so any filtering
 * happens after it is read.
 */
export const NAPTAN_CSV_URL = "https://naptan.api.dft.gov.uk/v1/access-nodes?dataFormat=csv";

/**
 * The NaPTAN CSV, from a cached copy if there is one.
 *
 * A hundred megabytes is not something to download on every build, and a
 * nightly that fails because the DfT is briefly down has failed for no good
 * reason. The cache is written once and reused until somebody deletes it;
 * NaPTAN changes slowly and a stale coordinate is better than no build.
 */
export function naptanCsv(cacheDirectory: string, maxAgeDays = 30): () => Promise<string> {
  const file = naptanFile(cacheDirectory, maxAgeDays);

  return async () => fs.readFileSync(await file(), "utf8");
}

/**
 * The path of the cached NaPTAN CSV, downloading it if there is no current copy.
 *
 * A path rather than the text, for a caller that would rather stream 100MB than
 * hold it.
 */
export function naptanFile(cacheDirectory: string, maxAgeDays = 30): () => Promise<string> {
  return async () => {
    const file = path.join(cacheDirectory, "naptan.csv");

    if (!fresh(file, maxAgeDays)) {
      fs.mkdirSync(cacheDirectory, {recursive: true});
      console.log(`Downloading NaPTAN to ${file}`);

      const response = await fetch(NAPTAN_CSV_URL);

      if (!response.ok) {
        throw new Error(`NaPTAN returned ${response.status} ${response.statusText}`);
      }

      // Written under a temporary name and moved, so an interrupted download
      // does not leave a truncated file that looks like a good cache.
      const partial = `${file}.partial`;

      fs.writeFileSync(partial, Buffer.from(await response.arrayBuffer()));
      fs.renameSync(partial, file);
    }

    return file;
  };
}

function fresh(file: string, maxAgeDays: number): boolean {
  if (!fs.existsSync(file)) {
    return false;
  }

  const age = Date.now() - fs.statSync(file).mtimeMs;

  return age < maxAgeDays * 24 * 60 * 60 * 1000;
}
