import {
  PATTERNS_PATH, WHOLE_BROTLI_PATH, WHOLE_PATH, patternStations, wholeBrotliBytes, wholeBytes
} from "../patterns.js";

/**
 * The stations there are files for, as JSON, beside the files themselves.
 *
 * A station names its own file, so nothing needs an index to fetch one - but something does need to
 * know which stations exist before it asks, and reading that off a page meant for people is not a
 * way to find out. This is that list, generated from the directory the build published rather than
 * written down, so it cannot name a station whose file is not there.
 */
export async function GET(): Promise<Response> {
  const stations = await patternStations();
  const bytes = wholeBytes();
  const brotli = wholeBrotliBytes();

  return new Response(
    `${JSON.stringify({
      whole: bytes === undefined ? undefined : {
        path: WHOLE_PATH,
        bytes,
        brotli: brotli === undefined ? undefined : {path: WHOLE_BROTLI_PATH, bytes: brotli}
      },
      directory: PATTERNS_PATH,
      stations: stations.map(station => ({
        code: station.code,
        name: station.name,
        path: station.path,
        bytes: station.bytes,
        brotli: station.brotliBytes === 0
          ? undefined
          : {path: station.brotliPath, bytes: station.brotliBytes}
      }))
    }, null, 2)}\n`,
    {headers: {"content-type": "application/json"}}
  );
}
