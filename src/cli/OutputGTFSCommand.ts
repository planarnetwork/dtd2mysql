
import {CLICommand} from "./CLICommand";
import {Transfer} from "../gtfs/file/Transfer";
import {GTFSRepository} from "../gtfs/repository/GTFSRepository";
import {FileOutput} from "../gtfs/FileOutput";
import {ScheduleCalendar} from "../gtfs/native/ScheduleCalendar";
import {Schedule} from "../gtfs/native/Schedule";
import {CalendarFactory} from "../gtfs/CalendarFactory";

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

    await Promise.all([
      this.directCopy(this.repository.getTransfers(), "transfers.txt"),
      this.directCopy(this.repository.getStops(), "stops.txt"),
      //CalendarFactory.createCalendar(await this.repository.getSchedules())
    ]);

    await this.repository.end();
  }

  /**
   * Map SQL records to a file
   */
  private async directCopy(records: Promise<object[]>, filename: string): Promise<void> {
    const output = this.output.open(filename);
    const rows = await records;

    rows.forEach(row => output.write(row));
    output.end();
  }

}
