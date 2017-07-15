import {CLICommand} from "./CLICommand";
import {CIFRepository} from "../gtfs/repository/CIFRepository";
import {FileOutput} from "../gtfs/FileOutput";
import {Schedule} from "../gtfs/native/Schedule";
import {agencies} from "../../config/gtfs/agency";
import {Association} from "../gtfs/native/Association";
import {applyOverlays} from "../gtfs/command/ApplyOverlays";
import {mergeSchedules} from "../gtfs/command/MergeSchedules";
import {applyAssociations, AssociationIndex, ScheduleIndex} from "../gtfs/command/ApplyAssociations";
import {createCalendar, ServiceIdIndex} from "../gtfs/command/CreateCalendar";
import {ScheduleResults} from "../gtfs/repository/ScheduleBuilder";

export class OutputGTFSCommand implements CLICommand {

  private output: FileOutput;

  public constructor(
    private readonly repository: CIFRepository
  ) {}

  /**
   * Turn the timetable feed into GTFS files
   */
  public async run(argv: string[]): Promise<void> {
    this.output = new FileOutput(argv[3] || "./");

    const associationsP = this.repository.getAssociations();
    const scheduleResultsP = this.repository.getSchedules();
    const transfersP = this.copy(this.repository.getTransfers(), "transfers.txt");
    const stopsP = this.copy(this.repository.getStops(), "stops.txt");
    const agencyP = this.copy(agencies, "agency.txt");
    const fixedLinksP = this.copy(this.repository.getFixedLinks(), "links.txt");

    const schedules = this.getSchedules(await associationsP, await scheduleResultsP);
    const [calendars, calendarDates, serviceIds] = createCalendar(schedules);

    const calendarP = this.copy(calendars, "calendar.txt");
    const calendarDatesP = this.copy(calendarDates, "calendar_dates.txt");
    const tripsP = this.copyTrips(schedules, serviceIds);

    await Promise.all([
      agencyP,
      transfersP,
      stopsP,
      calendarP,
      calendarDatesP,
      tripsP,
      fixedLinksP,
      this.repository.end()
    ]);
  }

  /**
   * Map SQL records to a file
   */
  private async copy(results: object[] | Promise<object[]>, filename: string): Promise<void> {
    const rows = await results;

    return new Promise<void>(resolve => {
      const output = this.output.open(filename);

      rows.forEach(row => output.write(row));
      output.end();
      resolve();
    });
  }

  private copyTrips(schedules: Schedule[], serviceIds: ServiceIdIndex): Promise<void> {
    return new Promise<void>(resolve => {
      const trips = this.output.open("trips.txt");
      const stopTimes = this.output.open("stop_times.txt");
      const routeFile = this.output.open("routes.txt");
      const routes = {};

      for (const schedule of schedules) {
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

      resolve();
    });
  }

  private getSchedules(associations: Association[], scheduleResults: ScheduleResults): Schedule[] {
    const processedAssociations = <AssociationIndex>applyOverlays(associations);
    const processedSchedules = <ScheduleIndex>applyOverlays(scheduleResults.schedules, scheduleResults.idGenerator);
    const associatedSchedules = applyAssociations(processedSchedules, processedAssociations);

    return <Schedule[]>mergeSchedules(associatedSchedules);
  }

}
