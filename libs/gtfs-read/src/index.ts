// Read a GTFS feed as the rows it was written as.
//
// @gb-transit/gtfs-loader reads a feed into what a journey planner plans over -
// times as seconds, calls indexed by stop, and only the columns that needs. This
// reads the other direction: every file, every column, the rows as written, so a
// tool that rewrites a feed can put back what it took out.
//
// Filled in by the reader step; the parts it is built from are CSVParser,
// readZip and toChunks from @gb-transit/gtfs-loader.

export {};
