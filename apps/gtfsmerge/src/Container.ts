import { MergeCommand } from "./gtfs/MergeCommand";
import { GTFSLoader, gtfsStreamFactory } from "./gtfs/GTFSLoader";
import { GTFSOutputFactory } from "./gtfs/GTFSOutputFactory";
import { CalendarFactory } from "./gtfs/calendar/CalendarFactory";
import { ZipOutput } from "./zip/ZipOutput";
import * as cheapRuler from "cheap-ruler";

export class Container {

  public getMergeCommand(tempFolder: string, transferDistance: number): MergeCommand {
    return new MergeCommand(
      new GTFSLoader(gtfsStreamFactory),
      new GTFSOutputFactory(
        new CalendarFactory(),
        tempFolder,
        cheapRuler(46),
        transferDistance
      ),
      new ZipOutput(tempFolder)
    );
  }

}
