import {FileEntry, TransferOptions} from "ssh2";

/**
 * Where feed files come from.
 *
 * SFTP is the only implementation today and the DTD host still serves files
 * that way, but credential issuance moved from the NRDP to Rail Data
 * Marketplace in early 2026, and RDM offers an API. This is the seam that lets
 * a second transport arrive without `DownloadCommand` knowing: it lists and it
 * fetches, which is all downloading a feed needs.
 */
export interface FeedTransport {
  readdir(path: string): Promise<FileEntry[]>;
  fastGet(remote: string, local: string, options?: TransferOptions): Promise<void>;
  end(): void;
}
