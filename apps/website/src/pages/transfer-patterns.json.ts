import {PATTERNS_PATH, WHOLE_PATH, patternStations, wholeBytes} from "../patterns.js";

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

  return new Response(
    `${JSON.stringify({
      whole: bytes === undefined ? undefined : {path: WHOLE_PATH, bytes},
      directory: PATTERNS_PATH,
      stations: stations.map(station => ({
        code: station.code,
        name: station.name,
        path: `${PATTERNS_PATH}/${station.code}.br`,
        bytes: station.bytes
      }))
    }, null, 2)}\n`,
    {headers: {"content-type": "application/json"}}
  );
}
