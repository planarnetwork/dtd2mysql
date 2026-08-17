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
    const transfersP = this.copy(this.repository.getTransfers(), "transfers.txt", t => [t.from_stop_id, t.to_stop_id]);
    const stopsP = this.copy(this.repository.getStops(), "stops.txt", s => [s.stop_id]);
    const agencyP = this.copy(agencies, "agency.txt", a => [a.agency_id]);
    const fixedLinksP = this.copy(
      this.repository.getFixedLinks(),
      "links.txt",
      l => [l.from_stop_id, l.to_stop_id, l.mode, l.start_date, l.start_time]
    );

    const schedules = this.getSchedules(await associationsP, await scheduleResultsP);

    if (schedules.length === 0) {
      throw new Error(
        `No schedules run between ${range.from} and ${range.to}. ` +
        `Check the source holds a timetable feed covering those dates.`
      );
    }

    const [calendars, calendarDates, serviceIds] = createCalendar(schedules);

    const calendarP = this.copy(calendars, "calendar.txt", c => [c.service_id]);
    const calendarDatesP = this.copy(calendarDates, "calendar_dates.txt", d => [d.service_id, d.date]);
    const tripsP = this.copyTrips(schedules, serviceIds);

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
   * Every file is sorted before it is written, so no output depends on the order
   * a source happened to return its rows in. The key for each file is at the
   * call site, and rows it leaves tied are ordered by their whole contents -
   * links.txt has 1,276 rows that tie on their declared key.
   */
  private async copy<T extends object>(
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
  private copyTrips(schedules: Schedule[], serviceIds: ServiceIdIndex): Promise<any> {
    console.log("Writing trips.txt, stop_times.txt and routes.txt");
    const trips = this.output.open(`${this.baseDir}/trips.txt`);
    const stopTimes = this.output.open(`${this.baseDir}/stop_times.txt`);
    const routeFile = this.output.open(`${this.baseDir}/routes.txt`);

    // A trip needs its route's number, and that number comes from where the
    // route name sorts rather than from which trip reached it first.
    const routes = chooseRoutes(schedules);
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

    for (const schedule of written) {
      trips.write(schedule.toTrip(serviceIds[schedule.calendar.id], routeIds[schedule.routeShortName]));
      schedule.stopTimes.forEach(r => stopTimes.write(r));
    }

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
 * The declared key first, then the whole row.
 *
 * The whole row is what makes the order total, and it is read in field name
 * order so that two sources building the same row differently still agree. It
 * costs a JSON encoding of the row, so it is computed on the first tie rather
 * than for every row of every file.
 */
function byKeyThenWholeRow<T extends object>(a: Keyed<T>, b: Keyed<T>): number {
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
 * One route per name, and which one cannot depend on arrival order.
 *
 * Trips sharing a route can disagree about its description - 352 do, over
 * whether first class is available - because it is a property of a train being
 * flattened onto the line it runs on. Neither is right, so the one that sorts
 * first wins.
 */
function chooseRoutes(schedules: Schedule[]): Map<string, Route> {
  const chosen = new Map<string, {route: Route, description: string}>();

  for (const schedule of schedules) {
    if (schedule.stopTimes.length <= 1) {
      continue;
    }

    const route = schedule.toRoute();
    const description = describes(route);
    const current = chosen.get(schedule.routeShortName);

    if (!current || description < current.description) {
      chosen.set(schedule.routeShortName, {route, description});
    }
  }

  return new Map([...chosen].map(([name, {route}]) => [name, route]));
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

/**
 * A row, its declared key, and the tiebreak once anything has needed it.
 */
interface Keyed<T> {
  readonly row: T;
  readonly key: Value[];
  whole: string;
}

type Value = string | number | null | undefined;
