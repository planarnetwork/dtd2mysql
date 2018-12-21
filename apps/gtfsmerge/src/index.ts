import {loadGTFS} from "./loadGTFS";
import {GTFSFileStream} from "./GTFSFileStream";
import * as fs from "fs";
import {MergedGTFS} from "./MergedGTFS";
import {exec} from "child_process";
import {sync as rimraf} from "rimraf";

async function run(inputs: string[], output: string) {
  const TMP = "/tmp/gtfsmerge/";

  if (fs.existsSync(TMP)) {
    rimraf(TMP);
  }

  fs.mkdirSync(TMP);

  const calendarStream = new GTFSFileStream(
    fs.createWriteStream(TMP + "calendar.txt"),
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
    fs.createWriteStream(TMP + "calendar_dates.txt"),
    [
      "service_id",
      "date",
      "exception_type"
    ]
  );

  const tripsStream = new GTFSFileStream(
    fs.createWriteStream(TMP + "trips.txt"),
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
    fs.createWriteStream(TMP + "stop_times.txt"),
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
    fs.createWriteStream(TMP + "routes.txt"),
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
    fs.createWriteStream(TMP + "agency.txt"),
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
    fs.createWriteStream(TMP + "stops.txt"),
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
    fs.createWriteStream(TMP + "transfers.txt"),
    [
      "from_stop_id",
      "to_stop_id",
      "transfer_type",
      "min_transfer_time"
    ]
  );

  const mergedGTFS = new MergedGTFS(
    calendarStream,
    calendarDatesStream,
    tripsStream,
    stopTimesStream,
    routesStream,
    agencyStream,
    stopsStream,
    transfersStream
  );

  for (const input of inputs) {
    const gtfs = await loadGTFS(input);

    mergedGTFS.merge(gtfs);
  }

  await Promise.all([
    calendarDatesStream.end(),
    calendarStream.end(),
    tripsStream.end(),
    stopTimesStream.end(),
    routesStream.end(),
    agencyStream.end(),
    stopsStream.end(),
    transfersStream.end()
  ]);

  console.log("Zipping...");
  await exec(`zip -j ${output} ${TMP}*.txt`, { maxBuffer: Number.MAX_SAFE_INTEGER });
  console.log("Complete.");
}

run(
  process.argv.slice(2, process.argv.length - 1),
  process.argv[process.argv.length - 1]
)
.catch(e => console.error(e));