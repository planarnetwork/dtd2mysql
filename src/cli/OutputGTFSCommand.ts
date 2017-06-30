
import {CLICommand} from "./CLICommand";
import {Transfer} from "../gtfs/file/Transfer";
import {GTFSRepository} from "../gtfs/repository/GTFSRepository";
import {FileOutput} from "../gtfs/FileOutput";
import {ScheduleCalendar} from "../gtfs/native/ScheduleCalendar";
import {Schedule} from "../gtfs/native/Schedule";
import {CalendarFactory, ServiceIdIndex} from "../gtfs/CalendarFactory";
import {Calendar} from "../gtfs/file/Calendar";
import {CalendarDate} from "../gtfs/file/CalendarDate";
import {Trip} from "../gtfs/file/Trip";
import {StopTime} from "../gtfs/file/StopTime";

export class OutputGTFSCommand implements CLICommand {

  private output: FileOutput;

  public constructor(
    private readonly repository: GTFSRepository
  ) {}

  /**
   * Turn the timetable feed into GTFS files
   */
  public async run(argv: string[]): Promise<void> {
    this.output = new FileOutput(argv[3] || "./");

    const transfersP = this.copy(this.repository.getTransfers(), "transfers.txt");
    const stopsP = this.copy(this.repository.getStops(), "stops.txt");
    const schedules = await this.repository.getSchedules();
    const [calendars, calendarDates, serviceIds] = CalendarFactory.createCalendar(schedules);
    const calendarP = this.copy(calendars, "calendar.txt");
    const calendarDatesP = this.copy(calendarDates, "calendar_dates.txt");
    const tripsP = this.copyTrips(schedules, serviceIds);

    await Promise.all([
      transfersP,
      stopsP,
      calendarP,
      calendarDatesP,
      tripsP,
      this.repository.end()
    ]);
  }

  /**
   * Map SQL records to a file
   */
  private async copy(results: object[] | Promise<object[]>, filename: string): Promise<void> {
    const rows = await results;

    return new Promise<void>((resolve, reject) => {
      const output = this.output.open(filename);

      rows.forEach(row => output.write(row));
      output.end();
      resolve();
    });
  }

  private copyTrips(schedules: Schedule[], serviceIds: ServiceIdIndex): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const trips = this.output.open("trips.txt");
      const stopTimes = this.output.open("stop_times.txt");

      for (const schedule of schedules) {
        trips.write(schedule.toTrip(serviceIds[schedule.id]));
        schedule.stopTimes.forEach(r => stopTimes.write(r));
      }

      trips.end();
      stopTimes.end();
      resolve();
    });
  }
}
