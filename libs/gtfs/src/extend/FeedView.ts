import {CRS, Stop, StopID} from "../entity/Stop";

/**
 * The built feed, to read.
 *
 * An extension needs to know what the feed contains - there is no point
 * publishing an area whose every member is a station this feed does not have -
 * but it has no business changing any of it. That is the difference between an
 * extension and an enricher, and the reason they are separate interfaces rather
 * than one with a wider return type.
 *
 * The stops are `Readonly`, so an extension that meant to write has to say so
 * to the compiler rather than discovering at review time that it could.
 */
export interface FeedView {

  /** Every stop the feed publishes, stations and boarding points alike. */
  readonly stops: readonly Readonly<Stop>[];

  /**
   * Just the stations. An external source keyed on stations - which is most of
   * them - should not have to know that a station has platforms beneath it.
   */
  readonly stations: readonly Readonly<Stop>[];

  /** By the id the feed publishes, which is the ATCO code. */
  stop(id: StopID): Readonly<Stop> | undefined;

  /**
   * By CRS, which is what an external source almost always has.
   *
   * `stop()` takes the ATCO code because that is what the feed publishes, and
   * nothing outside the feed knows it. A source with `EUS` would otherwise have
   * to rebuild this index itself, and every one of them would.
   */
  station(crs: CRS): Readonly<Stop> | undefined;

}
