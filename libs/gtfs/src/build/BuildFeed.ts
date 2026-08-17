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
import {CRS, Stop} from "../entity/Stop";
import {locate} from "../source/Located";
import {FixedLink} from "../entity/FixedLink";
import * as fs from "fs";
import {addLateNightServices} from "../transform/AddLateNightServices";
import {finished} from "node:stream/promises";

export class BuildFeed {
  private baseDir!: string;

  public constructor(
    private readonly repository: TimetableSource,
    private readonly output: GTFSOutput,
    private readonly context: BuildContext
  ) {}

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
    const agencyP = this.copy(agencies, "agency.txt", by("agency_id"));
    const fixedLinksP = this.copy(
      fixedLinksQ,
      "links.txt",
      by("from_stop_id", "to_stop_id", "mode", "start_date", "start_time")
    );

    const schedules = this.getSchedules(await associationsP, await scheduleResultsP);

    if (schedules.length === 0) {
      throw new Error(
        `No schedules run between ${range.from} and ${range.to}. ` +
        `Check the source holds a timetable feed covering those dates.`
      );
    }

    // stops.txt is written after the schedules and the links are known, because
    // whether an unlocated station is published depends on whether anything
    // references it.
    const stops = locate(await stopsQ, referenced(schedules, await fixedLinksQ));
    const published = new Set(stops.map(stop => stop.stop_id));
    const stopsP = this.copy(stops, "stops.txt", by("stop_id"));
    const transfersP = this.copy(
      (await transfersQ).filter(transfer => published.has(transfer.from_stop_id)),
      "transfers.txt",
      by("from_stop_id", "to_stop_id")
    );

    const [calendars, calendarDates, serviceIds] = createCalendar(schedules);

    const calendarP = this.copy(calendars, "calendar.txt", by("service_id"));
    const calendarDatesP = this.copy(calendarDates, "calendar_dates.txt", by("service_id", "date"));
    const tripsP = this.copyTrips(schedules, serviceIds, names(stops));

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
      fixedLinksP
    ]);

    await Promise.all([this.repository.end(), this.output.end()]);
  }

  /**
   * Write rows to a file, in the order the key says.
   *
   * Every file is sorted before it is written, so no output depends on the
   * order a source happened to return its rows in. The key for each file is at
   * the call site.
   */
  private async copy(
    results: object[] | Promise<object[]>,
    filename: string,
    key: (a: any, b: any) => number
  ): Promise<void> {
    const rows = await results;
    const output = this.output.open(`${this.baseDir}/${filename}`);

    console.log("Writing " + filename);
    [...rows].sort(key).forEach(row => output.write(row));
    output.end();

    return finished(output);
  }

  /**
   * trips.txt, stop_times.txt and routes.txt have interdependencies so they are written together
   */
  private copyTrips(schedules: Schedule[], serviceIds: ServiceIdIndex, stopNames: Map<string, string>): Promise<any> {
    console.log("Writing trips.txt, stop_times.txt and routes.txt");
    const trips = this.output.open(`${this.baseDir}/trips.txt`);
    const stopTimes = this.output.open(`${this.baseDir}/stop_times.txt`);
    const routeFile = this.output.open(`${this.baseDir}/routes.txt`);

    // A trip needs a route before it can be written, and a route's number comes
    // from where its name sorts rather than from which trip reached it first.
    //
    // Trips on one route can disagree about the route's description - 352 of
    // them do, over whether first class is available - because it is a property
    // of a train being flattened onto the line it runs on. There is no right
    // answer, so the answer is the one that sorts first rather than the one that
    // arrived first.
    const routes = new Map<string, Route>();

    for (const schedule of schedules) {
      if (schedule.stopTimes.length <= 1) {
        continue;
      }

      const candidate = schedule.toRoute();
      const chosen = routes.get(schedule.routeShortName);

      if (!chosen || describes(candidate) < describes(chosen)) {
        routes.set(schedule.routeShortName, candidate);
      }
    }

    const routeIds: { [routeShortName: string]: number } = {};
    let routeId = 0;

    for (const name of [...routes.keys()].sort()) {
      routeIds[name] = ++routeId;
      routeFile.write({...routes.get(name)!, route_id: routeId});
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

      trips.write(schedule.toTrip(
        serviceIds[schedule.calendar.id],
        routeIds[schedule.routeShortName],
        name ?? schedule.destination
      ));
      schedule.stopTimes.forEach(r => stopTimes.write(r));
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
 * Where a trip is going, by the CRS code of the stop it ends at. A stop the feed
 * never described falls back to the code itself rather than to nothing.
 */
function names(stops: Stop[]): Map<string, string> {
  return new Map(stops.map(stop => [stop.stop_id, stop.stop_name]));
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
 * Sort by the named fields, and then by everything else.
 *
 * The named fields say what the file is ordered by and are what the
 * documentation quotes. The fallback is what makes the order total: a key that
 * leaves two rows tied would leave their order to whatever the source returned,
 * which is the thing this is here to remove. links.txt has 1,276 rows that tie
 * on their declared key.
 *
 * The fallback reads the row's fields in name order rather than in the order the
 * object was built, so two sources that build the same row differently still
 * agree.
 */
function by(...fields: string[]): (a: any, b: any) => number {
  return (a, b) => {
    for (const field of fields) {
      const order = compare(a[field], b[field]);

      if (order !== 0) {
        return order;
      }
    }

    return compare(canonical(a), canonical(b));
  };
}

/**
 * Null sorts before everything, so a missing value has a place rather than
 * comparing equal to whatever it is put next to.
 */
function compare(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return -1;
  if (b === null || b === undefined) return 1;

  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * A route without its number, which is assigned later.
 */
function describes(route: Route): string {
  const {route_id, ...rest} = route;

  return canonical(rest);
}

function canonical(row: object): string {
  return JSON.stringify(Object.entries(row).sort(([a], [b]) => a < b ? -1 : 1));
}
