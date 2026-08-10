import config from "@gb-rail/dtd-schema";
import {MultiRecordFile, RecordAction, RecordWithManualIdentifier, SingleRecordFile} from "@gb-rail/feed-parser";
import {
  Association,
  AssociationType,
  DateIndicator,
  DateRange,
  FixedLink,
  FixedLinkRecord,
  IdGenerator,
  Schedule,
  ScheduleBuilder,
  ScheduleCalendar,
  ScheduleResults,
  ScheduleStopTimeRow,
  StationCoordinates,
  StationRecord,
  Stop,
  STP,
  TimetableSource,
  toFixedLinks,
  toStop,
  Transfer,
  TransferType
} from "@gb-rail/gtfs";
import {FeedZip} from "./FeedZip";
import {charColumns, MemoryTable, Row} from "./MemoryTable";

const timetable = config.timetable;

/**
 * A TimetableSource that reads the DTD feed files directly, with no database.
 *
 * The storage app imports the feed into MySQL and queries it back;
 * MySqlTimetableSource's SQL is the specification this implements. Where the two
 * disagree the SQL is right, because it is what has been shipping - which is why
 * the MySQL semantics that look like accidents are reproduced deliberately and
 * commented rather than tidied up:
 *
 *  - a CHAR column loses its trailing spaces and a VARCHAR does not (MemoryTable)
 *  - GROUP BY crs_code returns the first row inserted for that code
 *  - UNION dedupes the fixed links, which is the only reason importing the same
 *    ALF three times does not triple links.txt
 *
 * Feeds are applied in the order given, so a full refresh followed by its
 * incrementals produces what importing them in that order would.
 */
export class CifFileSource implements TimetableSource {

  private reference?: Promise<Reference>;
  private schedules?: Promise<Timetable>;

  constructor(
    private readonly sources: string[],
    private readonly stationCoordinates: StationCoordinates
  ) {}

  /**
   * SELECT crs_code, ... FROM physical_station WHERE crs_code IS NOT NULL GROUP BY crs_code
   */
  public async getStops(): Promise<Stop[]> {
    const {stations} = await this.loadReference();

    return groupByCrs(stations.rows.filter(row => row.crs_code !== null))
      .map(row => toStop(row as unknown as StationRecord, this.stationCoordinates));
  }

  /**
   * SELECT crs_code, crs_code, 2, minimum_change_time * 60 FROM physical_station
   * WHERE cate_interchange_status IS NOT NULL GROUP BY crs_code
   *
   * Note there is no `crs_code IS NOT NULL` here, unlike getStops.
   */
  public async getTransfers(): Promise<Transfer[]> {
    const {stations} = await this.loadReference();

    return groupByCrs(stations.rows.filter(row => row.cate_interchange_status !== null))
      .map(row => ({
        from_stop_id: row.crs_code as string,
        to_stop_id: row.crs_code as string,
        transfer_type: TransferType.MinTime,
        min_transfer_time: (row.minimum_change_time as number) * 60
      }));
  }

  /**
   * The ALF links between two known stations, plus the FLF links for any pair
   * ALF does not cover, deduplicated the way the UNION deduplicates them.
   */
  public async getFixedLinks(): Promise<FixedLink[]> {
    const {stations, additionalFixedLinks, fixedLinks} = await this.loadReference();

    const known = new Set(stations.rows.map(row => String(row.crs_code)));
    const covered = new Set(additionalFixedLinks.rows.map(row => `${row.origin}${row.destination}`));
    const records: FixedLinkRecord[] = [];

    for (const row of additionalFixedLinks.rows) {
      if (known.has(String(row.origin)) && known.has(String(row.destination))) {
        records.push({
          mode: row.mode as string,
          duration: (row.duration as number) * 60,
          origin: row.origin as string,
          destination: row.destination as string,
          start_time: row.start_time as string,
          end_time: row.end_time as string,
          start_date: row.start_date as string | null,
          end_date: row.end_date as string | null,
          monday: row.monday, tuesday: row.tuesday, wednesday: row.wednesday,
          thursday: row.thursday, friday: row.friday, saturday: row.saturday,
          sunday: row.sunday
        } as unknown as FixedLinkRecord);
      }
    }

    for (const row of fixedLinks.rows) {
      if (!covered.has(`${row.origin}${row.destination}`)) {
        records.push({
          mode: row.mode as string,
          duration: (row.duration as number) * 60,
          origin: row.origin as string,
          destination: row.destination as string,
          start_time: "00:00:00",
          end_time: "23:59:59",
          start_date: "2017-01-01",
          end_date: "2038-01-19",
          monday: 1, tuesday: 1, wednesday: 1, thursday: 1, friday: 1, saturday: 1, sunday: 1
        });
      }
    }

    return dedupe(records, row => JSON.stringify(row)).flatMap(toFixedLinks);
  }

  public async getSchedules(range: DateRange): Promise<ScheduleResults> {
    const {schedules, maxId} = await this.loadTimetable(range);

    return {schedules, idGenerator: idsFrom(maxId + 1)};
  }

  public async getAssociations(range: DateRange): Promise<Association[]> {
    const {associations} = await this.loadTimetable(range);

    return associations;
  }

  public async end(): Promise<any> {
    return undefined;
  }

  private loadReference(): Promise<Reference> {
    return this.reference ??= this.readReference();
  }

  private loadTimetable(range: DateRange): Promise<Timetable> {
    return this.schedules ??= this.readTimetable(range);
  }

  /**
   * MSN, ALF and FLF from every feed, in order.
   *
   * All of them are read before any schedule is, because the schedule queries
   * join to physical_station and MySQL does that join against the finished
   * table - an incremental can introduce a station that a schedule in the
   * refresh calls at.
   */
  private async readReference(): Promise<Reference> {
    const msn = timetable["MSN"] as MultiRecordFile;
    const alf = timetable["ALF"] as SingleRecordFile;
    const flf = timetable["FLF"] as MultiRecordFile;

    const stations = new MemoryTable(msn.records["A"]);
    const additionalFixedLinks = new MemoryTable(alf.recordTypes[0]);
    const fixedLinks = new MemoryTable(flf.records["A"]);

    for (const source of this.sources) {
      const zip = new FeedZip(source);

      try {
        await zip.eachLine("MSN", line => {
          const record = msn.getRecord(line);

          if (record && record.name === "physical_station") {
            stations.apply(record.extractValues(line));
          }
        });
        await zip.eachLine("ALF", line => {
          additionalFixedLinks.apply(alf.recordTypes[0].extractValues(line));
        });
        await zip.eachLine("FLF", line => {
          const record = flf.getRecord(line);

          if (record) {
            fixedLinks.apply(record.extractValues(line));
          }
        });
      }
      finally {
        zip.close();
      }
    }

    return {stations, additionalFixedLinks, fixedLinks};
  }

  /**
   * MCA or CFA and ZTR from every feed, in order.
   */
  private async readTimetable(range: DateRange): Promise<Timetable> {
    const {stations} = await this.loadReference();
    const crsByTiploc = new Map<string, string>();

    for (const row of stations.rows) {
      if (row.crs_code !== null) {
        crsByTiploc.set(row.tiploc_code as string, row.crs_code as string);
      }
    }

    const mca = timetable["MCA"] as MultiRecordFile;
    const cfa = timetable["CFA"] as MultiRecordFile;
    const ztr = timetable["ZTR"] as MultiRecordFile;

    // CFA shares MCA's record objects, which is how the schedule ids carry on
    // from the refresh into the incrementals. Reset them so loading twice in one
    // process assigns the same ids as loading once.
    (mca.records["BS"] as RecordWithManualIdentifier).lastId = 0;
    (ztr.records["BS"] as RecordWithManualIdentifier).lastId = 0;

    const loader = new ScheduleLoader(range, crsByTiploc);

    for (const source of this.sources) {
      const zip = new FeedZip(source);
      const extensions = zip.extensions;

      try {
        const scheduleFile = extensions.includes("MCA") ? "MCA" : "CFA";
        const file = scheduleFile === "MCA" ? mca : cfa;

        await zip.eachLine(scheduleFile, line => loader.readTimetableLine(file, line));
        loader.endOfFile();

        await zip.eachLine("ZTR", line => loader.readZTrainLine(ztr, line));
        loader.endOfFile();
      }
      finally {
        zip.close();
      }
    }

    return loader.results((mca.records["BS"] as RecordWithManualIdentifier).lastId);
  }

}

/**
 * Accumulates one schedule at a time.
 *
 * Only the finished Schedule objects are kept, never the raw rows: a three month
 * window is nearly three million stop time rows and holding those as well as the
 * schedules built from them roughly doubles peak memory for no benefit.
 */
class ScheduleLoader {

  private readonly schedules = new Map<string, Schedule>();
  private readonly zSchedules = new Map<string, Schedule>();
  private readonly associations = new MemoryTable((timetable["MCA"] as MultiRecordFile).records["AA"]);
  private readonly tiplocs = new MemoryTable((timetable["MCA"] as MultiRecordFile).records["TI"]);
  private pending: Pending | null = null;

  constructor(
    private readonly range: DateRange,
    private readonly crsByTiploc: Map<string, string>
  ) {}

  public readTimetableLine(file: MultiRecordFile, line: string): void {
    const record = file.getRecord(line);

    if (!record) {
      return;
    }

    switch (record.name) {
      case "schedule": {
        const parsed = record.extractValues(line);

        return this.startSchedule(parsed.action, charColumns(record, parsed.values), false);
      }

      case "schedule_extra":
        if (this.pending) {
          this.pending.extra = charColumns(record, record.extractValues(line).values);
        }
        return;

      case "stop_time":
        if (this.pending) {
          this.addStop(charColumns(record, record.extractValues(line).values));
        }
        return;

      case "association":
        this.associations.apply(record.extractValues(line));
        return;

      case "tiploc":
        this.tiplocs.apply(record.extractValues(line));
        return;

      // CR service change records are imported but the GTFS build never reads them
      default:
        return;
    }
  }

  public readZTrainLine(file: MultiRecordFile, line: string): void {
    const record = file.getRecord(line);

    if (!record) {
      return;
    }

    switch (record.name) {
      case "z_schedule": {
        const parsed = record.extractValues(line);

        return this.startSchedule(parsed.action, charColumns(record, parsed.values), true);
      }

      case "z_schedule_extra":
        if (this.pending) {
          this.pending.extra = charColumns(record, record.extractValues(line).values);
        }
        return;

      case "z_stop_time":
        if (this.pending) {
          this.addStop(charColumns(record, record.extractValues(line).values));
        }
        return;

      default:
        return;
    }
  }

  public endOfFile(): void {
    this.store();
  }

  public results(maxScheduleId: number): Timetable {
    this.store();

    const schedules = [...this.schedules.values()].sort(byStpThenId);
    const zTrains = [...this.zSchedules.values()].map(z => offsetId(z, maxScheduleId));
    const all = [...schedules, ...zTrains];
    const maxId = all.reduce((max, schedule) => Math.max(max, schedule.id), 0);

    return {schedules: all, associations: this.buildAssociations(), maxId};
  }

  private startSchedule(action: RecordAction, values: Row, zTrain: boolean): void {
    this.store();

    const target = zTrain ? this.zSchedules : this.schedules;
    const key = `${values.train_uid} ${values.runs_from} ${values.stp_indicator}`;

    // REPLACE INTO deletes the old row whether or not the new one is wanted
    if (action === RecordAction.Update) {
      target.delete(key);
    }

    if (action === RecordAction.Delete) {
      target.delete(key);
      return;
    }

    // INSERT IGNORE: the first record for a key wins, and the stop times that
    // follow the rejected one are orphaned and removed
    if (action === RecordAction.Insert && target.has(key)) {
      return;
    }

    if (!this.inWindow(values.runs_from as string, values.runs_to as string)) {
      return;
    }

    this.pending = {key, values, extra: null, stops: [], seen: new Set(), zTrain};
  }

  /**
   * The unique key on stop_time is (schedule, location, suffix,
   * public_departure_time), so a train calling twice at one place at the same
   * published time keeps only the first call.
   */
  private addStop(values: Row): void {
    const pending = this.pending!;
    const key = `${values.location} ${values.suffix} ${values.public_departure_time}`;

    if (pending.seen.has(key)) {
      return;
    }

    pending.seen.add(key);
    pending.stops.push(values);
  }

  private store(): void {
    const pending = this.pending;
    this.pending = null;

    if (!pending) {
      return;
    }

    const builder = new ScheduleBuilder();
    builder.load(pending.zTrain ? this.zTrainRows(pending) : this.scheduleRows(pending));

    const [schedule] = builder.results.schedules;

    if (schedule) {
      (pending.zTrain ? this.zSchedules : this.schedules).set(pending.key, schedule);
    }
  }

  /**
   * The passenger query: stop times joined to physical_station on the TIPLOC, so
   * a location that is not a station drops out, and passing times excluded. A
   * schedule with no stop time records at all survives as a single row of nulls.
   */
  private scheduleRows(pending: Pending): ScheduleStopTimeRow[] {
    const {values, extra, stops} = pending;
    const common = {
      id: values.id as number,
      train_uid: values.train_uid as string,
      retail_train_id: (extra?.retail_train_id ?? null) as string,
      runs_from: values.runs_from as string,
      runs_to: values.runs_to as string,
      monday: values.monday, tuesday: values.tuesday, wednesday: values.wednesday,
      thursday: values.thursday, friday: values.friday, saturday: values.saturday,
      sunday: values.sunday,
      stp_indicator: values.stp_indicator as STP,
      train_category: (values.train_status === "S" ? "SS" : values.train_category) as string,
      atoc_code: (extra?.atoc_code ?? null) as string | null,
      train_class: values.train_class as null | "S" | "B",
      reservations: values.reservations as null | "R" | "S" | "A"
    };

    if (stops.length === 0) {
      return [{...common, ...NO_STOP} as unknown as ScheduleStopTimeRow];
    }

    const rows: ScheduleStopTimeRow[] = [];

    for (const stop of stops) {
      const crs = this.crsByTiploc.get(stop.location as string);

      if (crs === undefined || stop.scheduled_pass_time !== null) {
        continue;
      }

      rows.push({...common, ...stopColumns(stop, crs, rows.length + 1)} as unknown as ScheduleStopTimeRow);
    }

    return rows;
  }

  /**
   * The z-train query. The join to z_stop_time is an inner one, so a z-train
   * with no stops does not appear at all, and the location is already a CRS
   * code rather than a TIPLOC.
   */
  private zTrainRows(pending: Pending): ScheduleStopTimeRow[] {
    const {values, extra, stops} = pending;
    const common = {
      id: values.id as number,
      // the query selects a bare `null` for this column, so it arrives undefined
      retail_train_id: undefined as unknown as string,
      train_uid: values.train_uid as string,
      runs_from: values.runs_from as string,
      runs_to: values.runs_to as string,
      monday: values.monday, tuesday: values.tuesday, wednesday: values.wednesday,
      thursday: values.thursday, friday: values.friday, saturday: values.saturday,
      sunday: values.sunday,
      stp_indicator: values.stp_indicator as STP,
      train_category: values.train_category as string,
      atoc_code: (extra?.atoc_code ?? null) as string | null,
      train_class: "S" as const,
      reservations: null
    };

    return stops.map((stop, index) =>
      ({...common, ...stopColumns(stop, stop.location as string, index + 1)}) as ScheduleStopTimeRow
    );
  }

  /**
   * JOIN tiploc ON assoc_location = tiploc_code, so an association at a location
   * the feed never described is dropped, and ORDER BY stp_indicator DESC, id.
   */
  private buildAssociations(): Association[] {
    const rows = this.associations.rows
      .filter(row =>
        this.tiplocs.get(row.assoc_location) !== undefined
        && this.inWindow(row.start_date as string, row.end_date as string)
      )
      .sort(byStpThenId);

    return rows.map(row => new Association(
      row.id as number,
      row.base_uid as string,
      row.assoc_uid as string,
      this.tiplocs.get(row.assoc_location)!.crs_code as string,
      row.assoc_date_ind as DateIndicator,
      row.assoc_cat as AssociationType,
      new ScheduleCalendar(
        Temporal.PlainDate.from(row.start_date as string),
        Temporal.PlainDate.from(row.end_date as string),
        {
          0: row.sunday as 0 | 1,
          1: row.monday as 0 | 1,
          2: row.tuesday as 0 | 1,
          3: row.wednesday as 0 | 1,
          4: row.thursday as 0 | 1,
          5: row.friday as 0 | 1,
          6: row.saturday as 0 | 1
        }
      ),
      row.stp_indicator as STP
    ));
  }

  private inWindow(from: string, to: string): boolean {
    return from < this.range.to.toString() && to >= this.range.from.toString();
  }

}

function stopColumns(stop: Row, crs: string, sequence: number) {
  return {
    crs_code: crs,
    stop_id: sequence,
    public_arrival_time: stop.public_arrival_time,
    public_departure_time: stop.public_departure_time,
    scheduled_arrival_time: stop.scheduled_arrival_time,
    scheduled_departure_time: stop.scheduled_departure_time,
    platform: stop.platform,
    activity: stop.activity
  };
}

const NO_STOP = {
  crs_code: null,
  stop_id: null,
  public_arrival_time: null,
  public_departure_time: null,
  scheduled_arrival_time: null,
  scheduled_departure_time: null,
  platform: null,
  activity: null
};

/**
 * ORDER BY stp_indicator DESC, id
 */
function byStpThenId(a: any, b: any): number {
  const aStp = String(a.stp_indicator ?? a.stp);
  const bStp = String(b.stp_indicator ?? b.stp);

  return aStp === bStp ? (a.id as number) - (b.id as number) : (aStp < bStp ? 1 : -1);
}

/**
 * GROUP BY crs_code keeps the first row inserted for each code, and returns the
 * groups in code order.
 */
function groupByCrs(rows: Row[]): Row[] {
  const groups = new Map<string, Row>();

  for (const row of rows) {
    const crs = String(row.crs_code);

    if (!groups.has(crs)) {
      groups.set(crs, row);
    }
  }

  return [...groups.values()].sort((a, b) => String(a.crs_code) < String(b.crs_code) ? -1 : 1);
}

function dedupe<T>(rows: T[], keyOf: (row: T) => string): T[] {
  const seen = new Set<string>();

  return rows.filter(row => {
    const key = keyOf(row);

    return seen.has(key) ? false : (seen.add(key), true);
  });
}

/**
 * The z-train query offsets the ids past the passenger schedules so the two sets
 * cannot collide.
 */
function offsetId(schedule: Schedule, offset: number): Schedule {
  return new Schedule(
    schedule.id + offset,
    schedule.stopTimes,
    schedule.tuid,
    schedule.rsid,
    schedule.calendar,
    schedule.mode,
    schedule.operator,
    schedule.stp,
    schedule.firstClassAvailable,
    schedule.reservationPossible
  );
}

function* idsFrom(start: number): IdGenerator {
  let id = start;

  while (true) {
    yield id++;
  }
}

interface Pending {
  key: string;
  values: Row;
  extra: Row | null;
  stops: Row[];
  seen: Set<string>;
  zTrain: boolean;
}

interface Reference {
  stations: MemoryTable;
  additionalFixedLinks: MemoryTable;
  fixedLinks: MemoryTable;
}

interface Timetable {
  schedules: Schedule[];
  associations: Association[];
  maxId: number;
}
