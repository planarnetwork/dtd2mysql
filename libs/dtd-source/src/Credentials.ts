/**
 * Where the feed lives and who is allowed to read it.
 *
 * One place, because the answer changed in early 2026 and will change again.
 * The NRDP at `opendata.nationalrail.co.uk` was retired; the SFTP host still
 * serves the files, but the account that reaches it now comes from Rail Data
 * Marketplace at `raildata.org.uk`. Nothing about the transport changed, only
 * where the username and password are obtained, which is exactly why resolving
 * them belongs somewhere a reader can find.
 */
export interface FeedCredentials {
  host: string;
  username: string;
  password: string;
}

export const DTD_HOST = "dtd.atocrsp.org";

export function feedCredentials(env: NodeJS.ProcessEnv = process.env): FeedCredentials {
  const username = env.SFTP_USERNAME;
  const password = env.SFTP_PASSWORD;

  if (!username || !password) {
    throw new Error(
      "SFTP_USERNAME and SFTP_PASSWORD are needed to download a feed. They come from a Rail Data " +
      "Marketplace subscription to the Timetable and Fares feeds - raildata.org.uk - not from the " +
      "National Rail open data portal, which was retired in early 2026. SFTP_HOSTNAME overrides " +
      `the host, which defaults to ${DTD_HOST}.`
    );
  }

  return {host: env.SFTP_HOSTNAME || DTD_HOST, username, password};
}
