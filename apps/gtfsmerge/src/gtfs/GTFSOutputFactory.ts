import * as fs from "fs";
import { sync as rimraf } from "rimraf";
import { GTFSOutput } from "./GTFSOutput";
import { CalendarMerger } from "./merger/CalendarMerger";
import { MemoizedSequence } from "../sequence/MemoizedSequence";
import { StopsAndTransfersMerger } from "./merger/StopsAndTransfersMerger";
import { StopTimesMerger } from "./merger/StopTimesMerger";
import { TripsMerger } from "./merger/TripsMerger";
import { GenericMerger } from "./merger/GenericMerger";
import { CalendarFactory } from "./calendar/CalendarFactory";
import { CSVStream } from "../csv/CSVStream";
import { Sequence } from "../sequence/Sequence";
import { CheapRuler } from "cheap-ruler";

export class GTFSOutputFactory {

  constructor(
    private readonly calendarFactory: CalendarFactory,
    private readonly tempFolder: string,
    private readonly ruler: CheapRuler,
    private readonly transferDistance: number
  ) {}

  public create(): GTFSOutput {
    if (fs.existsSync(this.tempFolder)) {
      rimraf(this.tempFolder);
    }

    fs.mkdirSync(this.tempFolder);

    const calendarStream = new CSVStream(
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
    calendarStream.pipe(fs.createWriteStream(this.tempFolder + "calendar.txt"));

    const calendarDatesStream = new CSVStream(
      [
        "service_id",
        "date",
        "exception_type"
      ]
    );
    calendarDatesStream.pipe(fs.createWriteStream(this.tempFolder + "calendar_dates.txt"));

    const tripsStream = new CSVStream(
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
    tripsStream.pipe(fs.createWriteStream(this.tempFolder + "trips.txt"));

    const stopTimesStream = new CSVStream(
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
    stopTimesStream.pipe(fs.createWriteStream(this.tempFolder + "stop_times.txt"));

    const routesStream = new CSVStream(
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
    routesStream.pipe(fs.createWriteStream(this.tempFolder + "routes.txt"));

    const agencyStream = new CSVStream(
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
    agencyStream.pipe(fs.createWriteStream(this.tempFolder + "agency.txt"));

    const stopsStream = new CSVStream(
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
    stopsStream.pipe(fs.createWriteStream(this.tempFolder + "stops.txt"));

    const transfersStream = new CSVStream(
      [
        "from_stop_id",
        "to_stop_id",
        "transfer_type",
        "min_transfer_time"
      ]
    );
    transfersStream.pipe(fs.createWriteStream(this.tempFolder + "transfers.txt"));

    return new GTFSOutput(
      new CalendarMerger(calendarStream, calendarDatesStream, this.calendarFactory, new MemoizedSequence()),
      new StopsAndTransfersMerger(stopsStream, transfersStream, this.ruler, this.transferDistance),
      new StopTimesMerger(stopTimesStream),
      new TripsMerger(tripsStream, new Sequence()),
      new GenericMerger(agencyStream),
      new GenericMerger(routesStream)
    );
  }
}
