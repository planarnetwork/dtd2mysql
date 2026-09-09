import {MergeCommand} from "./gtfs/MergeCommand";
import {GTFSOutputFactory} from "./gtfs/GTFSOutputFactory";
import {CalendarFactory} from "./gtfs/calendar/CalendarFactory";
import CheapRuler from "cheap-ruler";
import {RouteType} from "@gb-transit/gtfs-schema";
import {RouteTypeIndex} from "./gtfs/merger/RouteMerger";

/**
 * Great Britain runs from about 50 to 59 degrees north.
 *
 * Cheap Ruler trades exactness for speed by flattening the earth at one
 * latitude, so the latitude it is given is the one its distances are right at.
 * This was 46 - central France - which made every generated walk transfer in a
 * GB feed a percent or two out, and its transfer times with it. 54 is the middle
 * of the island; --ruler-latitude is for anywhere else.
 */
export const DEFAULT_LATITUDE = 54;

export class Container {

  public getMergeCommand(
    tempFolder: string,
    transferDistance: number,
    removeRoutes: string[],
    latitude: number = DEFAULT_LATITUDE,
    shapes = true
  ): MergeCommand {
    const removeRouteIndex = removeRoutes.reduce((index, routeType) => {
      index[Number(routeType) as RouteType] = true;

      return index;
    }, {} as RouteTypeIndex);

    return new MergeCommand(
      new GTFSOutputFactory(
        new CalendarFactory(),
        tempFolder,
        new CheapRuler(latitude),
        shapes,
        transferDistance,
        removeRouteIndex
      ),
      tempFolder,
      shapes
    );
  }

}
