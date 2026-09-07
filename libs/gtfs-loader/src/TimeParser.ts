import { parseDuration } from "@gb-transit/gtfs-schema/scalars";

/**
 * Parses time strings and returns them as seconds from midnight. Caches results.
 *
 * The arithmetic is the feed build's `parseDuration`, so a time this reads and a time
 * @gb-transit/gtfs writes mean the same thing. What is here is the cache.
 *
 * A Map rather than an object: the cache is looked up twice per stop time, so several million times
 * over a national feed, and an object lookup has to internalise the string being looked up first.
 * Worth about 3% of the load on the GB rail feed, which is small but consistent.
 */
export class TimeParser {

  private readonly timeCache = new Map<string, number>();

  /**
   * Convert a time string to seconds from midnight.
   *
   * Throws on a time it cannot read, rather than returning NaN and letting the nonsense travel.
   */
  public getTime(time: string) {
    const cached = this.timeCache.get(time);

    if (cached !== undefined) {
      return cached;
    }

    const seconds = parseDuration(time);

    this.timeCache.set(time, seconds);

    return seconds;
  }

}
