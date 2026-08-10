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

    const associationsP = this.repository.getAssociations(range);
    const scheduleResultsP = this.repository.getSchedules(range);
    const transfersP = this.copy(this.repository.getTransfers(), "transfers.txt");
    const stopsP = this.copy(this.repository.getStops(), "stops.txt");
    const agencyP = this.copy(agencies, "agency.txt");
    const fixedLinksP = this.copy(this.repository.getFixedLinks(), "links.txt");

    const schedules = this.getSchedules(await associationsP, await scheduleResultsP);

    if (schedules.length === 0) {
      throw new Error(
        `No schedules run between ${range.from} and ${range.to}. ` +
        `Check the source holds a timetable feed covering those dates.`
      );
    }

    const [calendars, calendarDates, serviceIds] = createCalendar(schedules);

    const calendarP = this.copy(calendars, "calendar.txt");
    const calendarDatesP = this.copy(calendarDates, "calendar_dates.txt");
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
   * Map SQL records to a file
   */
  private async copy(results: object[] | Promise<object[]>, filename: string): Promise<void> {
    const rows = await results;
    const output = this.output.open(`${this.baseDir}/${filename}`);

    console.log("Writing " + filename);
    rows.forEach(row => output.write(row));
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
    const routes: { [routeShortName: string]: Route } = {};

    for (const schedule of schedules) {
      if (schedule.stopTimes.length <= 1) {
        continue;
      }

      const route = schedule.toRoute();
      routes[route.route_short_name] = routes[route.route_short_name] || route;
      const routeId = routes[route.route_short_name].route_id;
      const serviceId = serviceIds[schedule.calendar.id];

      trips.write(schedule.toTrip(serviceId, routeId));
      schedule.stopTimes.forEach(r => stopTimes.write(r));
    }

    for (const route of Object.values(routes)) {
      routeFile.write(route);
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
