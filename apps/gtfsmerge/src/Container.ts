import {MergedGTFS} from "./gtfs/MergedGTFS";
import * as fs from "fs";
import {sync as rimraf} from "rimraf";
import {GTFSFileStream} from "./gtfs/output/GTFSFileStream";
import {CalendarFactory} from "./calendar/CalendarFactory";
import {MergeCommand} from "./gtfs/command/MergeCommand";

export class Container {

  public getMergeCommand(transferDistance: number, tempFolder: string): MergeCommand {
    return new MergeCommand(this.getMergedGTFS(transferDistance, tempFolder));
  }

  private getMergedGTFS(transferDistance: number, tempFolder: string): MergedGTFS {
    if (fs.existsSync(tempFolder)) {
      rimraf(tempFolder);
    }

    fs.mkdirSync(tempFolder);

    const calendarStream = new GTFSFileStream(
      fs.createWriteStream(tempFolder + "calendar.txt"),
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
      fs.createWriteStream(tempFolder + "calendar_dates.txt"),
      [
        "service_id",
        "date",
        "exception_type"
      ]
    );

    const tripsStream = new GTFSFileStream(
      fs.createWriteStream(tempFolder + "trips.txt"),
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
      fs.createWriteStream(tempFolder + "stop_times.txt"),
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
      fs.createWriteStream(tempFolder + "routes.txt"),
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
      fs.createWriteStream(tempFolder + "agency.txt"),
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
      fs.createWriteStream(tempFolder + "stops.txt"),
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
      fs.createWriteStream(tempFolder + "transfers.txt"),
      [
        "from_stop_id",
        "to_stop_id",
        "transfer_type",
        "min_transfer_time"
      ]
    );

    return new MergedGTFS(
      calendarStream,
      calendarDatesStream,
      tripsStream,
      stopTimesStream,
      routesStream,
      agencyStream,
      stopsStream,
      transfersStream,
      transferDistance,
      new CalendarFactory()
    );
  }
}
