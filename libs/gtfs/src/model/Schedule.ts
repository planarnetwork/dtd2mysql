import {StopTime} from "../entity/StopTime";
import {ScheduleCalendar} from "./ScheduleCalendar";
import {Trip} from "../entity/Trip";
import {Route, RouteType} from "../entity/Route";
import {AgencyID} from "../entity/Agency";
import {CRS} from "../entity/Stop";
import {OverlayRecord, RSID, STP, TUID} from "./OverlayRecord";
import {toYYYYMMDD} from "./PlainDate";
import {agencies} from "../data/agency";

/**
 * The identifier for a trip, stable across data revisions.
 *
 * The STP indicator is deliberately left out, so that when an overlay covering a whole permanent
 * schedule is withdrawn the trip keeps its ID and reads as an amended timetable rather than one
 * trip disappearing and another appearing.
 */
export function tripId(tuid: TUID, calendar: ScheduleCalendar): string {
  return `${tuid}_${toYYYYMMDD(calendar.runsFrom)}_${toYYYYMMDD(calendar.runsTo)}`;
}

const BLACK = "000000";
const WHITE = "FFFFFF";

function getAccessibleTextColor(hex : string) {
  // Convert hex to RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  // Calculate relative luminance according to WCAG 2.1
  const calLuminance = (c : number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const L = 0.2126 * calLuminance(r) + 0.7152 * calLuminance(g) + 0.0722 * calLuminance(b);

  // Return black or white based on the standard WCAG luminance threshold
  return L > 0.179 ? BLACK : WHITE;
}

const routeInformation: {
  [key: string]: {
    route_short_name?: string,
    route_long_name?: string,
    route_color?: string,
    route_text_color?: string,
    route_url?: string
  }
} = {
  "AW": {route_short_name: 'TfW Rail', route_long_name: "Transport for Wales", route_color: "ff0000"},
  "CC": {route_long_name: "c2c", route_color: "b7007c"},
  "CH": {route_long_name: "Chiltern Railways", route_color: "00bfff"},
  "CS": {route_long_name: "Caledonian Sleeper", route_color: "1d2e35"},
  "EM": {route_short_name: "EMR", route_long_name: "East Midlands Railway", route_color: "713563"},
  "ES": {route_long_name: "Eurostar", route_color: "ffd700"},
  "GC": {route_long_name: "Grand Central", route_color: "1d1d1b"},
  "GN": {route_long_name: "Great Northern", route_color: "0099ff"},
  "GR": {route_short_name: "LNER", route_long_name: "London North Eastern Railway", route_color: "ce0e2d"},
  "GW": {route_short_name: "GWR", route_long_name: "Great Western Railway", route_color: "0a493e"},
  "GX": {route_long_name: "Gatwick Express", route_color: "eb1e2d"},
  "HT": {route_long_name: "Hull Trains", route_color: "de005c"},
  "HX": {route_long_name: "Heathrow Express", route_color: "532e63"},
  "IL": {route_long_name: "Island Line", route_color: "1e90ff"},
  "LD": {route_long_name: "Lumo", route_color: "2b6ef5"},
  "LE": {route_long_name: "Greater Anglia", route_color: "d70428"},
  "LF": {route_long_name: "Lumo Stirling", route_color: "2b6ef5"},
  "LM": {route_short_name: 'WMT', route_long_name: "West Midlands Trains"},
  'LN': {route_short_name: 'LNR', route_long_name: 'London Northwestern Railway', route_color: '00bf6f', route_url: 'https://www.londonnorthwesternrailway.co.uk/'},
  "LO": {route_short_name: "Overground", route_long_name: "London Overground", route_color: "ff7518"},
  "LT": {route_short_name: "Underground", route_long_name: "London Underground", route_color: "000f9f"},
  "ME": {route_long_name: "Merseyrail", route_color: "fff200"},
  "NT": {route_long_name: "Northern", route_color: "0f0d78"},
  "SE": {route_long_name: "Southeastern", route_color: "389cff"},
  "SN": {route_long_name: "Southern", route_color: "8cc63e"},
  "SR": {route_long_name: "ScotRail", route_color: "1e467d"},
  "SW": {route_short_name: "SWR", route_long_name: "South Western Railway", route_color: "24398c"},
  "SX": {route_long_name: "Stansted Express", route_color: "6b717a"},
  "TL": {route_long_name: "Thameslink", route_color: "ff5aa4"},
  "TP": {route_short_name: "TPE", route_long_name: "TransPennine Express", route_color: "09a4ec"},
  "TW": {route_short_name: "Metro", route_long_name: "Tyne & Wear Metro"},
  "VT": {route_short_name: 'Avanti', route_long_name: "Avanti West Coast", route_color: "004354"},
  'WM': {route_short_name: 'WMR', route_long_name: 'West Midlands Railway', route_color: 'e07709', route_url: 'https://www.westmidlandsrailway.co.uk/'},
  "XC": {route_long_name: "CrossCountry", route_color: "660f21"},
  "XR": {route_long_name: "Elizabeth line", route_color: "9364cc", route_url: "https://tfl.gov.uk/elizabeth-line/route/elizabeth/"},
  "BAK": {route_short_name: "Bakerloo", route_color: "a65a2a", route_url: "https://tfl.gov.uk/tube/route/bakerloo/"},
  "DST": {route_short_name: "District", route_color: "007934", route_url: "https://tfl.gov.uk/tube/route/district/"},
  "MET": {route_short_name: "Metropolitan", route_color: "870f54", route_url: "https://tfl.gov.uk/tube/route/metropolitan/"},
  "LIB": {route_short_name: "Liberty", route_color: "61686B", route_url: "https://tfl.gov.uk/overground/route/liberty/"},
  "LIO": {route_short_name: "Lioness", route_color: "FFA600", route_url: "https://tfl.gov.uk/overground/route/lioness/"},
  "MIL": {route_short_name: "Mildmay", route_color: "006FE6", route_url: "https://tfl.gov.uk/overground/route/mildmay/"},
  "SUF": {route_short_name: "Suffragette", route_color: "18A95D", route_url: "https://tfl.gov.uk/overground/route/suffragette/"},
  "WEA": {route_short_name: "Weaver", route_color: "9B0058", route_url: "https://tfl.gov.uk/overground/route/weaver/"},
  "WIN": {route_short_name: "Windrush", route_color: "DC241F", route_url: "https://tfl.gov.uk/overground/route/windrush/"},
  "ME_Northern": {route_short_name: "Northern", route_color: "0266b2", route_url: "https://www.merseytravel.gov.uk/timetables/rail/northern-line/"},
  "ME_Wirral": {route_short_name: "Wirral", route_color: "00a94f", route_url: "https://www.merseytravel.gov.uk/timetables/rail/wirral-line/"},
  "GRN": {route_short_name: "Green", route_color: "32B457"},
  "YEL": {route_short_name: "Yellow", route_color: "FCB828"},
}

/**
 * A CIF schedule (BS record)
 */
export class Schedule implements OverlayRecord {

  constructor(
    public readonly id: number,
    public readonly stopTimes: StopTime[],
    public readonly tuid: TUID,
    public readonly rsid: RSID,
    public readonly calendar: ScheduleCalendar,
    public readonly mode: RouteType,
    public readonly operator: AgencyID,
    public readonly stp: STP,
    public readonly firstClassAvailable: boolean,
    public readonly reservationPossible: boolean
  ) {}
  
  public get tripId(): string {
    return tripId(this.tuid, this.calendar);
  }

  public get origin(): CRS {
    return this.stopTimes[0].stop_id;
  }

  public get destination(): CRS {
    return this.stopTimes[this.stopTimes.length - 1].stop_id;
  }

  /**
   * Clone the current record with the new calendar and id, and optionally a
   * different set of calls.
   *
   * The stop times are copied because callers shift the times of a clone in place.
   */
  public clone(calendar: ScheduleCalendar, scheduleId: number, stopTimes: StopTime[] = this.stopTimes): Schedule {
    return new Schedule(
      scheduleId,
      stopTimes.map(st => Object.assign({}, st)),
      this.tuid,
      this.rsid,
      calendar,
      this.mode,
      this.operator,
      this.stp,
      this.firstClassAvailable,
      this.reservationPossible
    );
  }

  /**
   * Convert to a GTFS Trip.
   *
   * The headsign is what a passenger reads on the front of the train, so it is
   * where the train is going. `destination` is the name of the last stop, which
   * the caller has and this does not.
   *
   * `wheelchair_accessible` and `bikes_allowed` are both 0, which in GTFS means
   * "no information". Nothing in the DTD feed says otherwise, and claiming
   * either way would be inventing an answer.
   */
  public toTrip(serviceId: number, destination: string): Trip {
    return {
      route_id: this.routeId,
      service_id: serviceId,
      trip_id: this.stopTimes[0].trip_id,
      trip_headsign: destination,
      trip_short_name: this.rsid,
      direction_id: 0,
      wheelchair_accessible: 0,
      bikes_allowed: 0
    };
  }

  /**
   * We are trying to assign routes which are shown in mainstream journey
   * planners and aligning with station information boards, using the following
   * rules:
   *
   * For London Underground, Tyne & Wear Metro, London Overground and 
   * Merseyrail, the official line names are used.
   * For West Midland Trains, show "WMR" or "LNR" depending on the where the
   * service goes.
   * For Greater Anglia, show "Stansted Express" if it runs between the airport
   * and London, Stratford, Tottenham Hale or Seven Sisters
   * Otherwise, use the short form of the operator brand name.
   * 
   * TODO: If it is a bus service and the actual route number is available in the
   * "headcode" field, use it.
   */
  private get bareRouteId(): string {
    const stopAtCallback = this.stopAt.bind(this);
    
    if (this.operator === 'LM') {
      const lnrTermini = ['EUS', 'WFJ', 'TRI', 'BLY', 'MKC', 'NMP', 'SAA', 'BDM', 'LIV', 'CRE'];
      if (lnrTermini.includes(this.origin) || lnrTermini.includes(this.destination)) {
        return 'LN'; // London Northwestern Railway
      }
      return 'WM'; // West Midlands railway
    }
    
    if (this.operator === 'LE' && [this.origin, this.destination].includes('SSD')) {
      if (['LST', 'SRA', 'SVS', 'TOM'].some(stopAtCallback)) {
        return 'SX';
      }
    }

    if (this.operator === 'LO') {
      if (['LST', 'HAC', 'SKW', 'EDR', 'ENF', 'CHN', 'WST', 'CHI'].some(stopAtCallback)) {
        return 'WEA';
      }
      // some Suffragette line services run through to Willesden Junction
      if (['HRY', 'WMW', 'LER', 'BKG'].some(stopAtCallback)) {
        return 'SUF';
      }
      if (['RMF', 'UPM'].some(stopAtCallback)) {
        return 'LIB';
      }
      // I am considering Stratford - Watford through-running services to be Lioness line here, however services terminating at Willesden Junction are not.
      if (['SBP', 'HRW', 'WFH', 'WFJ'].some(stopAtCallback)) {
        return 'LIO';
      }
      if (['KPA', 'SPB', 'RMD', 'SAT', 'HDH', 'CMD', 'HKC', 'SRA'].some(stopAtCallback)) {
        return 'MIL';
      }
      if (['DLJ', 'SDC', 'ZCW', 'SQE', 'NXG', 'NWX', 'SYD', 'WCY', 'CYP'].some(stopAtCallback)) {
        return 'WIN';
      }
      if (['EUS', 'KBN', 'QPW'].some(stopAtCallback)) {
        return 'LIO';
      }
    }
    
    if (this.operator === 'ME') {
      if (['HNX', 'LPY', 'SDL', 'BAH', 'HLR', 'SOP', 'KKD', 'WAO', 'MAG', 'OMS', 'RIL', 'KIR', 'HBL', 'AIN'].some(stopAtCallback)) {
        return 'ME_Northern';
      }
      if (['BKQ', 'NBN', 'BID', 'WKI', 'RFY', 'PSL', 'HOO', 'ELP', 'CTR'].some(stopAtCallback)) {
        return 'ME_Wirral';
      }
    }
    
    if (this.operator === 'LT') {
      if (['AMR', 'ZCM', 'RIC', 'ZMP', 'HOH', 'ZBS'].some(stopAtCallback)) {
        return 'MET';
      }
      if (['RMD', 'GUN', 'ZTU'].some(stopAtCallback)) {
        return 'DST';
      }
      if (['QPW', 'SBP', 'HRW'].some(stopAtCallback)) {
        return 'BAK';
      }
    }
    
    if (this.operator === 'TW') {
      if (['APN', 'FEG', 'REG', 'SUN'].some(stopAtCallback)) {
        return 'GRN';
      }
      // I can't see any Yellow line service appearing in the National Rail timetable
    }
    
    return this.operator;
  }
  
  public get routeId() : string {
    return this.mode === RouteType.Bus ? `${this.bareRouteId}_BUS` : this.mode === RouteType.ReplacementBus ? `${this.bareRouteId}_RRB` : this.bareRouteId;
  }

  /**
   * Convert to GTFS Route.
   */
  public toRoute(): Route {
    const routeData = routeInformation[this.bareRouteId];
    const agencyName = agencies.find(agency => agency.agency_id === this.operator)?.agency_name;
    const routeColor = routeData?.route_color;
    
    return {
      route_id: this.routeId,
      agency_id: agencies.some(agency => agency.agency_id === this.operator) ? this.operator : 'ZZ',
      route_short_name: routeData?.route_short_name 
          ?? (routeData?.route_long_name === undefined && agencyName === undefined ? this.bareRouteId : undefined),
      route_long_name: routeData?.route_long_name
          ?? (routeData?.route_short_name === undefined ? agencyName : undefined),
      route_type: this.mode,
      route_text_color: routeColor === undefined ? undefined : getAccessibleTextColor(routeColor),
      route_color: routeData?.route_color,
      route_url: routeData?.route_url,
      route_desc: undefined,
    };
  }

  public before(location: CRS): StopTime[] {
    return this.stopTimes.slice(0, this.stopTimes.findIndex(s => s.stop_id === location));
  }

  public after(location: CRS): StopTime[] {
    return this.stopTimes.slice(this.stopTimes.findIndex(s => s.stop_id === location) + 1);
  }

  public stopAt(location: CRS): StopTime | undefined {
    return <StopTime>this.stopTimes.find(s => s.stop_id === location);
  }

}

