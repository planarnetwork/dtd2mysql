import {GTFSFileStream} from "./GTFSFileStream";
import {Mode, Service, TransXChange} from "../transxchange/TransXChange";

/**
 * Extract the routes from the TransXChange objects
 */
export class RoutesStream extends GTFSFileStream {
  protected header = "route_id,agency_id,route_short_name,route_long_name,route_type,route_text_color,route_url,route_desc";

  private routesSeen: Record<string, boolean> = {};
  private routeType = {
    [Mode.Air]: 1100,
    [Mode.Bus]: 3,
    [Mode.Coach]: 3,
    [Mode.Ferry]: 4,
    [Mode.Train]: 2,
    [Mode.Tram]: 0,
    [Mode.Underground]: 1
  };

  protected transform(data: TransXChange): void {
    for (const service of data.Services) {
      this.addRoute(service);
    }
  }

  private addRoute(service: Service): void {
    const routeId = service.ServiceCode;

    if (!this.routesSeen[routeId]) {
      this.routesSeen[routeId] = true;

      this.push(`${routeId},${service.RegisteredOperatorRef},${routeId},"${service.Description}",${this.routeType[service.Mode]},,,"${service.Description}"`);
    }
  }

}
