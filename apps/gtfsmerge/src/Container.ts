import {GTFSFileStream} from "./gtfs/output/GTFSFileStream";
import {MergeCommand} from "./gtfs/command/MergeCommand";

export class Container {

  public getMergeCommand(tempFolder: string): MergeCommand {
    const calendarStream = new GTFSFileStream(
      [
        "service_id",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
        "start_date",
        "end_date"
      ],
      "service_id"
    );

    const calendarDatesStream = new GTFSFileStream(
      [
        "service_id",
        "date",
        "exception_type"
      ]
    );

    const tripsStream = new GTFSFileStream(
      [
        "route_id",
        "service_id",
        "trip_id",
        "trip_headsign",
        "trip_short_name",
        "direction_id",
        "wheelchair_accessible",
        "bikes_allowed"
      ]
    );

    const stopTimesStream = new GTFSFileStream(
      [
        "trip_id",
        "arrival_time",
        "departure_time",
        "stop_id",
        "stop_sequence",
        "stop_headsign",
        "pickup_type",
        "drop_off_type",
        "shape_dist_traveled",
        "timepoint"
      ]
    );

    const routesStream = new GTFSFileStream(
      [
        "route_id",
        "agency_id",
        "route_short_name",
        "route_long_name",
        "route_type",
        "route_text_color",
        "route_color",
        "route_url",
        "route_desc"
      ],
      "route_id"
    );

    const agencyStream = new GTFSFileStream(
      [
        "agency_id",
        "agency_name",
        "agency_url",
        "agency_timezone",
        "agency_lang",
        "agency_phone",
        "agency_fare_url"
      ],
      "agency_id"
    );

    const stopsStream = new GTFSFileStream(
      [
        "stop_id",
        "stop_code",
        "stop_name",
        "stop_desc",
        "stop_lat",
        "stop_lon",
        "zone_id",
        "stop_url",
        "location_type",
        "parent_station",
        "stop_timezone",
        "wheelchair_boarding"
      ],
      "stop_id"
    );

    const transfersStream = new GTFSFileStream(
      [
        "from_stop_id",
        "to_stop_id",
        "transfer_type",
        "min_transfer_time"
      ]
    );


    return new MergeCommand(
      calendarStream,
      calendarDatesStream,
      tripsStream,
      stopTimesStream,
      routesStream,
      agencyStream,
      stopsStream,
      transfersStream,
      tempFolder
    );
  }

}
