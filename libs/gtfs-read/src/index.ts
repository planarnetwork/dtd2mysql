// Read a GTFS feed as the rows it was written as.
//
// @gb-transit/gtfs-loader reads a feed into what a journey planner plans over -
// times as seconds, calls indexed by stop, and only the columns it needs, from
// seven of the files. This reads the other direction: every file it knows, every
// column, values as the file held them, so a tool that rewrites a feed can put
// back what it took out. It is built out of that package's parts.

export {readFeed, readFeedRows} from "./ReadFeed";
export type {FeedHandlers, ReadFeedOptions} from "./ReadFeed";
export {FEED_FILES, READ_COLUMNS, feedFileOf, toRow} from "./FeedFile";
export type {FeedFileName, FeedRowTypes} from "./FeedFile";
