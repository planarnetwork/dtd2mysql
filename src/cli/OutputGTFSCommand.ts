
import {CLICommand} from "./CLICommand";
import {Transfer} from "../gtfs/Transfer";
import {GTFSRepository} from "../gtfs/repository/GTFSRepository";
import {FileOutput} from "../gtfs/FileOutput";

export class OutputGTFSCommand implements CLICommand {

  private output: FileOutput;

  public constructor(
    private readonly repository: GTFSRepository
  ) {}

  public async run(argv: string[]): Promise<void> {
    this.output = new FileOutput(argv[3] || "./");

    const transfers = this.insertTransfers();

    await transfers;
    await this.repository.end();
  }

  private async insertTransfers(): Promise<any> {
    const output = this.output.open("transfers.txt");
    const interchange = await this.repository.getInterchange();

    interchange.forEach(line => output.write(line));
    output.end();
  }

  // private insertStops(): Promise<any> {
  //   const output = this.fileOutput.getPipe("transfers.txt");
  //   const stops = this.repository.getStops();
  //
  //   stops.pipe(output);
  //
  //   return promisify(output);
  // }
  //
  // private async insertCalendar() {
  //   const schedules = await this.repository.getSchedules();
  //   const calendar = {};
  //   const trips = {};
  //
  //   for (const schedule in schedules) {
  //     if (!schedule.isCancellation) {
  //       calendar[schedule.tuid].push(schedule.asCalendar);
  //       trips[schedule.tuid].push(schedule.asTrip);
  //     }
  //
  //     for (const calendarItem in calendar[schedule.tuid]) {
  //       if (schedule.isShort) {
  //         calendarItem.addExcludeDays(schedule);
  //       }
  //       else {
  //         const additionalCalendarItem = calendarItem.divideAround(schedule);
  //         calendar.push(additionalCalendarItem);
  //       }
  //     }
  //   }
  // }
}