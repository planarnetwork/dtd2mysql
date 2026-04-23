import {GTFSFileStream} from "./GTFSFileStream";
import {Mode, Service, TransXChange} from "../transxchange/TransXChange";

/**
 * Extract the routes from the TransXChange objects
 */
export class RoutesStream extends GTFSFileStream<TransXChange> {
  protected header = "route_id,agency_id,route_short_name,route_long_name,route_type,route_text_color,route_color,route_url,route_desc";

  private routesSeen: Record<string, boolean> = {};
  private routeType: Record<Mode, number> = {
    [Mode.Air]: 1100,
    [Mode.Bus]: 3,
    [Mode.Coach]: 3,
    [Mode.Ferry]: 4,
    [Mode.Rail]: 2,
    [Mode.Train]: 2,
    [Mode.Tram]: 0,
    [Mode.Underground]: 1
  };

  protected transform(data: TransXChange): void {
    for (const service of Object.values(data.Services)) {
      this.addRoute(service);
    }
  }

  private addRoute(service: Service) {
    const routeId = service.ServiceCode;

    // TransXChange allows multiple lines per service; emit one GTFS route per line.
    for (const lineId in service.Lines) {
      const line = service.Lines[lineId];
      const id = routeId + "|" + lineId;

      if (!this.routesSeen[id]) {
        this.routesSeen[id] = true;

        this.pushLine(
          id,
          service.RegisteredOperatorRef,
          line.LineName,
          line.Description || service.Description,
          this.routeType[service.Mode],
          "",
          "",
          "",
          service.Description
        );
      }
    }
  }

}
