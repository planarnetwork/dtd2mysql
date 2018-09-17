import {GTFSFileStream} from "./GTFSFileStream";
import {TransXChange} from "../transxchange/TransXChange";

/**
 * Extract the routes from the TransXChange objects
 */
export class RoutesStream extends GTFSFileStream {
  private routesSeen: Record<string, string> = {};
  protected header = "route_id,agency_id,route_short_name,route_long_name,route_type,route_text_color,route_url,route_desc";

  protected transform(data: TransXChange): void {
    // for (const [journeyId, journey] of Object.entries(data.JourneySections)) {
    //   this.addRoute(journeyId, journey);
    // }
  }

  // private addRoute(journeyId: string, journey: Journey): void {
  //   const routeId = this.getRouteId();
  //
  //   if (!this.routesSeen[routeId]) {
  //     this.routesSeen[routeId] = routeId;
  //
  //     this.push(`${routeId},${schedule.operator},${routeId},${routeId},1100,,,,`);
  //   }
  // }

}
