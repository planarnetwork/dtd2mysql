import { MergeCommand } from "./gtfs/MergeCommand";
import { GTFSLoader, gtfsStreamFactory } from "./gtfs/GTFSLoader";
import { GTFSOutputFactory } from "./gtfs/GTFSOutputFactory";
import { CalendarFactory } from "./gtfs/calendar/CalendarFactory";
import { ZipOutput } from "./zip/ZipOutput";
import * as cheapRuler from "cheap-ruler";
import { RouteTypeIndex } from "./gtfs/merger/RouteMerger";

export class Container {

  public getMergeCommand(tempFolder: string, transferDistance: number, removeRoutes: string[]): MergeCommand {
    const removeRouteIndex = removeRoutes.reduce((index, routeType) => {
      index[routeType] = true;

      return index;
    }, {} as RouteTypeIndex);

    return new MergeCommand(
      new GTFSLoader(gtfsStreamFactory),
      new GTFSOutputFactory(
        new CalendarFactory(),
        tempFolder,
        cheapRuler(46),
        transferDistance,
        removeRouteIndex
      ),
      new ZipOutput(tempFolder)
    );
  }

}
