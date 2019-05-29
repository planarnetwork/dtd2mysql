import { MergeCommand } from "./gtfs/MergeCommand";
import { GTFSLoader } from "./gtfs/GTFSLoader";
import * as gtfs from "gtfs-stream";
import { GTFSOutputFactory } from "./gtfs/GTFSOutputFactory";
import { CalendarFactory } from "./gtfs/calendar/CalendarFactory";
import { ZipOutput } from "./zip/ZipOutput";

export class Container {

  public getMergeCommand(tempFolder: string, transferDistance: number): MergeCommand {
    return new MergeCommand(
      new GTFSLoader(gtfs({ raw: true })),
      new GTFSOutputFactory(
        new CalendarFactory(),
        tempFolder,
        transferDistance
      ),
      new ZipOutput(tempFolder)
    );
  }

}
