import {FileOutput} from "@gb-transit/gtfs-output";
import * as fs from "fs";
import * as path from "node:path";
import {GTFSOutput} from "./GTFSOutput";
import {AreasMerger} from "./merger/AreasMerger";
import {FeedInfoMerger} from "./merger/FeedInfoMerger";
import {DedupingWriter} from "./DedupingWriter";
import {
  AGENCY, AREAS, ATTRIBUTIONS, CALENDAR, CALENDAR_DATES, FEED_INFO, ROUTES, STOPS, STOP_AREAS,
  STOP_TIMES, TRANSFERS, TRIPS
} from "./MergeFeed";
import {CalendarMerger} from "./merger/CalendarMerger";
import {MemoizedSequence} from "../sequence/MemoizedSequence";
import {StopsAndTransfersMerger} from "./merger/StopsAndTransfersMerger";
import {StopTimesMerger} from "./merger/StopTimesMerger";
import {TripsMerger} from "./merger/TripsMerger";
import {GenericMerger} from "./merger/GenericMerger";
import {CalendarFactory} from "./calendar/CalendarFactory";
import {Sequence} from "../sequence/Sequence";
import CheapRuler from "cheap-ruler";
import {RouteMerger, RouteTypeIndex} from "./merger/RouteMerger";

export class GTFSOutputFactory {

  constructor(
    private readonly calendarFactory: CalendarFactory,
    private readonly directory: string,
    private readonly ruler: CheapRuler,
    private readonly transferDistance: number,
    private readonly removeRouteTypes: RouteTypeIndex
  ) {}

  /**
   * Open a file per output, in the columns this tool writes.
   *
   * Which columns each file has used to live in this method as an array of
   * strings beside each stream. It is now declared in MergeFeed.ts against the
   * row type, so a column that is not a field of the row it is written from does
   * not compile.
   */
  public create(): GTFSOutput {
    fs.rmSync(this.directory, {recursive: true, force: true});
    fs.mkdirSync(this.directory, {recursive: true});

    const output = new FileOutput();
    const at = (file: string) => path.join(this.directory, file);

    // Deduplicated because two feeds describe the same station, agency or
    // service in their own terms and the merged feed wants one row for it.
    const calendar = new DedupingWriter(
      output.open(at(CALENDAR.filename), CALENDAR.columns), row => String(row.service_id)
    );
    const routes = new DedupingWriter(
      output.open(at(ROUTES.filename), ROUTES.columns), row => String(row.route_id)
    );
    const agency = new DedupingWriter(
      output.open(at(AGENCY.filename), AGENCY.columns), row => String(row.agency_id)
    );
    const stops = new DedupingWriter(
      output.open(at(STOPS.filename), STOPS.columns), row => row.stop_id
    );
    const areas = new DedupingWriter(
      output.open(at(AREAS.filename), AREAS.columns), row => String(row.area_id)
    );
    const stopAreas = new DedupingWriter(
      output.open(at(STOP_AREAS.filename), STOP_AREAS.columns),
      row => `${row.area_id}_${row.stop_id}`
    );
    // Keyed on the statement rather than on the organisation: the DfT is the
    // authority for NaPTAN under one licence and could be the authority for
    // something else under another, and both statements are true.
    const attributions = new DedupingWriter(
      output.open(at(ATTRIBUTIONS.filename), ATTRIBUTIONS.columns),
      row => ATTRIBUTIONS.columns.map(column => String(row[column])).join()
    );

    const calendarDates = output.open(at(CALENDAR_DATES.filename), CALENDAR_DATES.columns);
    const trips = output.open(at(TRIPS.filename), TRIPS.columns);
    const stopTimes = output.open(at(STOP_TIMES.filename), STOP_TIMES.columns);
    const transfers = output.open(at(TRANSFERS.filename), TRANSFERS.columns);

    return new GTFSOutput(
      new CalendarMerger(calendar, calendarDates, this.calendarFactory, new MemoizedSequence()),
      new StopsAndTransfersMerger(stops, transfers, this.ruler, this.transferDistance),
      new StopTimesMerger(stopTimes),
      new TripsMerger(trips, new Sequence()),
      new GenericMerger(agency),
      new RouteMerger(routes, new Sequence(), this.removeRouteTypes),
      new GenericMerger(attributions),
      new AreasMerger(areas, stopAreas),
      new FeedInfoMerger(output.open(at(FEED_INFO.filename), FEED_INFO.columns))
    );
  }
}
