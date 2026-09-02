import {TimetableSource} from "../source/TimetableSource";
import {BuildContext, dateRange} from "./BuildContext";
import {Schedule} from "../model/Schedule";
import {agencies} from "../data/agency";
import {Association} from "../model/Association";
import {applyOverlays} from "../transform/ApplyOverlays";
import {mergeSchedules} from "../transform/MergeSchedules";
import {applyAssociations, AssociationIndex, ScheduleIndex} from "../transform/ApplyAssociations";
import {createCalendar, ServiceIdIndex} from "../transform/CreateCalendar";
import {ScheduleResults} from "./ScheduleBuilder";
import {GTFSOutput} from "./GTFSOutput";
import {Route} from "../entity/Route";
import {FeedRow} from "../entity/FeedRow";
import {CRS, Stop, TIPLOC} from "../entity/Stop";
import {locate, toStopRow} from "../source/Located";
import {createFeedInfo} from "../transform/CreateFeedInfo";
import {enrich, provenanceFile} from "../enrich/Enrich";
import {MutableFeed} from "../enrich/MutableFeed";
import {Enricher} from "../enrich/Enricher";
import {checkKeys, extend} from "../extend/Extend";
import {Extension} from "../extend/Extension";
import {TIMETABLE_ATTRIBUTION, createAttributions} from "../transform/CreateAttributions";
import {buildReport} from "./BuildReport";
import {Attribution} from "../enrich/Enricher";
import {mergeTransfers} from "../transform/MergeTransfers";
import {dropUnknownStops} from "../transform/DropUnknownStops";
import {toAgencyRow, toRouteRow} from "../transform/Noc";
import {toStopTimeRow, withStopPoints} from "../transform/Platforms";
import {FixedLink} from "../entity/FixedLink";
import * as fs from "fs";
import {addLateNightServices} from "../transform/AddLateNightServices";
import {finished} from "node:stream/promises";
import {Writable} from "stream";

export class BuildFeed {
  private baseDir!: string;

  public constructor(
    private readonly repository: TimetableSource,
    private readonly output: GTFSOutput,
    private readonly context: BuildContext,
    /**
     * Sources of detail the DTD does not carry. Empty produces the same feed as
     * a build with no enrichment at all.
     */
    private readonly enrichers: readonly Enricher[] = [],
    /**
     * Sources of files the core build has no concept of. Empty produces the
     * same feed as a build with no extensions at all.
     */
    private readonly extensions: readonly Extension[] = []
  ) {
    checkKeys(extensions);
  }

  /**
   * The dtd2mysql CLI takes the output directory as a positional argument
   */
  public async run(argv: string[]): Promise<void> {
    return this.build(argv[3] || ".");
  }

  /**
   * Turn the timetable feed into GTFS files
   */
  public async build(baseDir: string): Promise<void> {
    this.baseDir = baseDir;

    if (!fs.existsSync(this.baseDir)) {
      throw new Error(`Output path ${this.baseDir} does not exist.`);
    }

    const range = dateRange(this.context);

    console.log(`Building ${range.from} to ${range.to}\n`);

    const associationsP = this.repository.getAssociations();
    const scheduleResultsP = this.repository.getSchedules();
    const stopsQ = this.repository.getStops();
    const fixedLinksQ = this.repository.getFixedLinks();
    const transfersQ = this.repository.getTransfers();
    const versionQ = this.repository.getFeedVersion();
    const agencyP = this.copy(agencies.map(toAgencyRow), "agency.txt", a => [a.agency_id]);
    const fixedLinksP = this.context.links
      ? this.copy(
        fixedLinksQ,
        "links.txt",
        l => [l.from_stop_id, l.to_stop_id, l.mode, l.start_date, l.start_time]
      )
      : Promise.resolve();

    const [associations, scheduleResults] = await Promise.all([associationsP, scheduleResultsP]);
    const schedules = this.getSchedules(associations, scheduleResults);

    if (schedules.length === 0) {
      throw new Error(
        `No schedules run between ${range.from} and ${range.to}. ` +
        `Check the source holds a timetable feed covering those dates.`
      );
    }

    // stops.txt is written after the schedules and the links are known, because
    // whether an unlocated station is published depends on whether anything
    // references it.
    const [sourceStops, fixedLinks] = await Promise.all([stopsQ, fixedLinksQ]);
    // The boarding points are added before anything asks which stops the feed
    // publishes, because a call references one of them rather than the station.
    // Only the hierarchy is built here; a call's id is composed when
    // stop_times.txt is written, so nothing upstream of this sees it.
    const withChildren = withStopPoints(sourceStops, schedules);
    const stops = locate(withChildren, referenced(schedules, fixedLinks));
    // Every index the build keeps is on the CRS code, because that is what a
    // schedule, an association and a fixed link name a station by.
    const stations = new Map(
      stops.filter(stop => stop.parent_station === null).map(stop => [stop.crs, stop])
    );
    const called = dropUnknownStops(schedules, new Set(stations.keys()));
    // Only the stops are offered to an enricher. Trips and routes are streamed
    // straight to their files rather than held, and materialising 276,000 trips
    // to enrich a handful is the wrong trade until something needs it.
    const feed = new MutableFeed(stops, [], []);
    const reports = this.enrichers.length > 0 ? await enrich(feed, this.enrichers) : [];
    // Written whole rather than through copy(): it is a document, and the CSV
    // writer turns its nested arrays into `[object Object]`.
    const provenanceP = reports.length > 0
      ? this.output.write(
        `${this.baseDir}/provenance.json`,
        JSON.stringify(provenanceFile(feed, reports), null, 2) + "\n"
      )
      : undefined;

    // Extensions run after enrichment, so a file built out of the stops is
    // built out of the stops as they will be published rather than as the DTD
    // left them.
    const extended = this.extensions.length > 0
      ? await extend(feed, this.extensions)
      : {files: [], reports: []};
    const extensionsP = extended.files.map(
      file => this.copy([...file.rows], file.filename, file.key)
    );

    // Written whatever ran, because the timetable always needs crediting and
    // an enricher's licence may make it a condition rather than a courtesy.
    // Computed once and used twice, so the report cannot credit a different set
    // of sources from the file.
    const credits = createAttributions(this.attributions());
    const attributionsP = this.copy(
      credits,
      "attributions.txt",
      a => [a.organization_name, a.attribution_licence]
    );

    // What the sources did, kept where a workflow log cannot expire out from
    // under it. Only when something ran: a feed with no enrichment has nothing
    // to report that attributions.txt does not already say.
    const reportP = reports.length > 0 || extended.reports.length > 0
      ? this.output.write(
        `${this.baseDir}/enrichment-report.json`,
        JSON.stringify(buildReport(reports, extended.reports, credits), null, 2) + "\n"
      )
      : undefined;

    const stopsP = this.copy(stops.map(toStopRow), "stops.txt", s => [s.stop_id]);
    const transfersP = this.copy(
      mergeTransfers(await transfersQ, fixedLinks, map(stations, stop => stop.stop_id)),
      "transfers.txt",
      t => [t.from_stop_id, t.to_stop_id]
    );

    const [calendars, calendarDates, serviceIds] = createCalendar(called);

    const calendarP = this.copy(calendars, "calendar.txt", c => [c.service_id]);
    const calendarDatesP = this.copy(calendarDates, "calendar_dates.txt", d => [d.service_id, d.date]);
    const feedInfoP = this.copy(
      [createFeedInfo(calendars, calendarDates, range, await versionQ)],
      "feed_info.txt",
      f => [f.feed_publisher_name]
    );
    const tripsP = this.copyTrips(
      called,
      serviceIds,
      map(stations, stop => stop.stop_name),
      map(stations, stop => stop.tiploc)
    );

    // Every file has to be opened before the output can be asked whether it has
    // finished writing them, and copy() only opens its file once its query has
    // come back.
    await Promise.all([
      agencyP,
      transfersP,
      stopsP,
      calendarP,
      calendarDatesP,
      tripsP,
      fixedLinksP,
      feedInfoP,
      provenanceP,
      attributionsP,
      reportP,
      ...extensionsP
    ]);

    await Promise.all([this.repository.end(), this.output.end()]);
  }

  /**
   * Everything that has to be credited: the timetable, and whatever enricher or
   * extension actually ran.
   *
   * Taken from what each source declares about itself rather than from a list
   * kept here, so a package added without a licence is a compile error rather
   * than a feed quietly published outside its terms.
   */
  private attributions(): Attribution[] {
    return [
      TIMETABLE_ATTRIBUTION,
      ...this.enrichers.map(e => e.attribution),
      ...this.extensions.map(e => e.attribution)
    ].filter(attribution => attribution !== undefined);
  }

  /**
   * One row, to a file being streamed rather than sorted.
   *
   * trips.txt, stop_times.txt and routes.txt are written as they are built, so
   * they do not go through copy(). This is where they meet the same constraint.
   */
  private write<T extends FeedRow>(output: Writable, row: T): void {
    output.write(row);
  }

  /**
   * Write rows to a file, in the order the key says.
   *
   * A row, not a model: FeedRow is the ten files this build writes, so anything
   * a model carries that its file has no column for cannot reach here.
   *
   * Every file is sorted before it is written, so no output depends on the order
   * a source happened to return its rows in. The key for each file is at the
   * call site, and rows it leaves tied are ordered by their whole contents -
   * links.txt has 1,276 rows that tie on their declared key.
   */
  private async copy<T extends FeedRow>(
    results: T[] | Promise<T[]>,
    filename: string,
    key: (row: T) => Value[]
  ): Promise<void> {
    const rows = await results;
    const output = this.output.open(`${this.baseDir}/${filename}`);
    const keyed = rows.map(row => ({row, key: key(row), whole: ""}));

    console.log("Writing " + filename);
    keyed.sort(byKeyThenWholeRow);

    for (const {row} of keyed) {
      output.write(row);
    }

    output.end();

    return finished(output);
  }

  /**
   * trips.txt, stop_times.txt and routes.txt have interdependencies so they are written together
   */
  private copyTrips(
    schedules: Schedule[],
    serviceIds: ServiceIdIndex,
    stopNames: ReadonlyMap<CRS, string>,
    tiplocs: ReadonlyMap<CRS, TIPLOC>
  ): Promise<any> {
    console.log("Writing trips.txt, stop_times.txt and routes.txt");
    const trips = this.output.open(`${this.baseDir}/trips.txt`);
    const stopTimes = this.output.open(`${this.baseDir}/stop_times.txt`);
    const routeFile = this.output.open(`${this.baseDir}/routes.txt`);

    // Sorted by route ID, which a schedule works out for itself, so routes.txt
    // does not depend on the order the schedules arrived in.
    const routes = chooseRoutes(schedules);

    for (const id of [...routes.keys()].sort()) {
      this.write(routeFile, toRouteRow(routes.get(id)!));
    }

    // Sorting the schedules by trip ID sorts trips.txt, and sorts stop_times.txt
    // by (trip_id, stop_sequence) with it, because a schedule's stops are
    // contiguous and already in sequence.
    const written = schedules
      .filter(schedule => schedule.stopTimes.length > 1)
      .sort((a, b) => a.tripId < b.tripId ? -1 : a.tripId > b.tripId ? 1 : 0);

    const unknown = new Map<string, number>();

    for (const schedule of written) {
      const name = stopNames.get(schedule.destination);

      if (name === undefined) {
        unknown.set(schedule.destination, (unknown.get(schedule.destination) ?? 0) + 1);
      }

      this.write(trips, schedule.toTrip(
        serviceIds[schedule.calendar.id],
        name ?? schedule.destination
      ));
      schedule.stopTimes.forEach(r => this.write(stopTimes, toStopTimeRow(r, tiplocs)));
    }

    report(unknown);

    trips.end();
    stopTimes.end();
    routeFile.end();

    return Promise.all([
      finished(trips),
      finished(stopTimes),
      finished(routeFile),
    ]);
  }

  private getSchedules(associations: Association[], scheduleResults: ScheduleResults): Schedule[] {
    const processedAssociations: AssociationIndex = applyOverlays(associations);
    const processedSchedules: ScheduleIndex = applyOverlays(scheduleResults.schedules);
    const associatedSchedules = applyAssociations(processedSchedules, processedAssociations, scheduleResults.idGenerator);
    const mergedSchedules = <Schedule[]>mergeSchedules(associatedSchedules);
    const schedules = addLateNightServices(mergedSchedules, scheduleResults.idGenerator);

    // remove any schedules that no longer run on any days so invalid calendars are not output
    return schedules.filter(schedule => !schedule.calendar.isEmpty);
  }

}

/**
 * Every stop the feed points at from somewhere else. A station outside this set
 * contributes nothing but its own existence, so it is only worth publishing if it
 * can be put on a map.
 */
function referenced(schedules: Schedule[], links: FixedLink[]): Set<CRS> {
  const used = new Set<CRS>();

  for (const schedule of schedules) {
    for (const stopTime of schedule.stopTimes) {
      used.add(stopTime.stop_id);
    }
  }

  for (const link of links) {
    used.add(link.from_stop_id);
    used.add(link.to_stop_id);
  }

  return used;
}

/**
 * One property of every station, by CRS code - the name a headsign uses, the
 * stop id a transfer references, the TIPLOC a call's id is built from.
 */
function map<T>(stations: ReadonlyMap<CRS, Stop>, property: (stop: Stop) => T): ReadonlyMap<CRS, T> {
  return new Map([...stations].map(([crs, stop]) => [crs, property(stop)]));
}

/**
 * A trip ending at a stop that stops.txt does not describe keeps the CRS code as
 * its headsign, which is the best available answer but hides the real problem:
 * the stop times reference a stop that is not in the feed, which a GTFS
 * validator reads as a broken foreign key. Say so rather than let a three letter
 * code pass for a place name.
 */
function report(unknown: Map<string, number>): void {
  if (unknown.size === 0) {
    return;
  }

  const codes = [...unknown.entries()]
    .sort(([a], [b]) => a < b ? -1 : 1)
    .map(([code, trips]) => `${code} (${trips})`)
    .join(", ");

  console.warn(
    `${unknown.size} destination(s) are not in stops.txt, so their trips are named after the ` +
    `CRS code: ${codes}. The stop times referencing them are dangling.`
  );
}

/**
 * The declared key first, then the whole row.
 *
 * The whole row is what makes the order total, and it is read in field name
 * order so that two sources building the same row differently still agree. It
 * costs a JSON encoding of the row, so it is computed on the first tie rather
 * than for every row of every file.
 */
function byKeyThenWholeRow<T extends FeedRow>(a: Keyed<T>, b: Keyed<T>): number {
  for (let i = 0; i < a.key.length; i++) {
    const order = ascending(a.key[i], b.key[i]);

    if (order !== 0) {
      return order;
    }
  }

  return ascending(a.whole ||= canonical(a.row), b.whole ||= canonical(b.row));
}

/**
 * Ascending, with null first.
 *
 * A row's fields are typed as strings and numbers, but they come from a database
 * that can return null in any of them. `null < "SEV"` and `null > "SEV"` are
 * both false, so without this a row with a null key would sort wherever it
 * happened to be rather than in one place.
 */
function ascending(a: Value, b: Value): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return -1;
  if (b === null || b === undefined) return 1;

  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * The routes the schedules run on, keyed by their id.
 *
 * Every field of a Route but its type comes from the id, which the schedule
 * works out for itself, so schedules sharing an id describe the same route and
 * the last one to arrive can be kept.
 *
 * The type is the exception: only buses take an id of their own, so an operator
 * running two other modes - trains and a ferry, say - has one id for both and
 * whichever schedule arrives last says what the route is. Unresolved.
 *
 * Schedules with one call or none are skipped, because trips.txt skips them
 * too and a route nothing refers to would be a dangling row.
 */
function chooseRoutes(schedules: Schedule[]): Map<string, Route> {
  const chosen = new Map<string, Route>();

  for (const schedule of schedules) {
    if (schedule.stopTimes.length <= 1) {
      continue;
    }

    const route = schedule.toRoute();

    chosen.set(route.route_id, route);
  }

  return chosen;
}

function canonical(row: object): string {
  return JSON.stringify(Object.entries(row).sort(([a], [b]) => a < b ? -1 : 1));
}

/**
 * A row, its declared key, and the tiebreak once anything has needed it.
 */
interface Keyed<T> {
  readonly row: T;
  readonly key: Value[];
  whole: string;
}

type Value = string | number | null | undefined;
