/**
 * feed_info.txt. Required by no part of the spec and expected by most consumers:
 * it is where a feed says who made it, what it covers and which version this is,
 * and the validator warns without it.
 */
export interface FeedInfo {
  feed_publisher_name: string;
  feed_publisher_url: string;
  feed_lang: string;
  feed_start_date: string;
  feed_end_date: string;
  feed_version: string | null;
}

/**
 * feed_info.txt, as it is written. Every field of FeedInfo is a column of it.
 */
export type FeedInfoRow = FeedInfo;
