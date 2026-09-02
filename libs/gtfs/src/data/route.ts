import {AgencyID} from "../entity/Agency";
import {CRS} from "../entity/Stop";

/**
 * How a route is presented: the brand a passenger sees on a departure board,
 * and the colour it is drawn in on a route map.
 *
 * Keyed by the id `Schedule.bareRouteId` arrives at, which is an ATOC code for
 * an operator that runs one brand and a line code for one that runs several.
 *
 * A route with no entry here still gets a name, from the agency it belongs to.
 * The entry is what makes it a brand rather than an operator.
 *
 * Names and colours are the operators' own, taken from their public branding.
 * Colours are six hex digits without a leading hash, as GTFS writes them.
 */
export interface RouteBranding {
  route_short_name?: string;
  route_long_name?: string;
  route_color?: string;
  route_url?: string;
}

export const routeBranding: ReadonlyMap<string, RouteBranding> = new Map(Object.entries({
  "AW": {route_short_name: "TfW Rail", route_long_name: "Transport for Wales", route_color: "ff0000"},
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
  "LM": {route_short_name: "WMT", route_long_name: "West Midlands Trains"},
  "LN": {route_short_name: "LNR", route_long_name: "London Northwestern Railway", route_color: "00bf6f", route_url: "https://www.londonnorthwesternrailway.co.uk/"},
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
  "VT": {route_short_name: "Avanti", route_long_name: "Avanti West Coast", route_color: "004354"},
  "WM": {route_short_name: "WMR", route_long_name: "West Midlands Railway", route_color: "e07709", route_url: "https://www.westmidlandsrailway.co.uk/"},
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
}));

/**
 * Which line of a multi-line operator a service runs on, worked out from where
 * it goes.
 *
 * The DTD feed names the operator and nothing finer, so the line has to be
 * recovered from the calls. Each rule names stations that only its line serves:
 * a Weaver line service is one that calls at Liverpool Street or Chingford,
 * because no other Overground line does.
 *
 * The rules are ordered and the first that matches wins, so a service reaching
 * more than one line's stations takes the line listed first. Only rules for the
 * schedule's own operator are considered, so a code appearing under two
 * operators is not a conflict.
 *
 * A service matching no rule keeps its operator's own id, which is the right
 * answer for the operators that run one line and the honest one for a service
 * whose line cannot be told from where it calls.
 */
export interface LineRule {
  /** The ATOC code of the operator this rule reads. */
  operator: AgencyID;
  /** The id the matching service takes, which `routeBranding` names. */
  line: string;
  /** Matches a service starting or finishing at any of these. */
  between?: CRS[];
  /** Matches a service calling at any of these, at either end or in between. */
  calls?: CRS[];
}

export const lineRules: readonly LineRule[] = [
  // West Midlands Trains runs two brands, told apart by where the service ends
  // rather than by where it calls. Everything that is not London Northwestern
  // is West Midlands Railway, which is what the rule without a condition says.
  {operator: "LM", line: "LN", between: ["EUS", "WFJ", "TRI", "BLY", "MKC", "NMP", "SAA", "BDM", "LIV", "CRE"]},
  {operator: "LM", line: "WM"},

  // A Greater Anglia service to or from Stansted Airport is the Stansted
  // Express when it runs down the line to London, and an ordinary service to
  // Cambridge or Peterborough when it does not.
  {operator: "LE", line: "SX", between: ["SSD"], calls: ["LST", "SRA", "SVS", "TOM"]},

  {operator: "LO", line: "WEA", calls: ["LST", "HAC", "SKW", "EDR", "ENF", "CHN", "WST", "CHI"]},
  // Some Suffragette line services run through to Willesden Junction.
  {operator: "LO", line: "SUF", calls: ["HRY", "WMW", "LER", "BKG"]},
  {operator: "LO", line: "LIB", calls: ["RMF", "UPM"]},
  // Stratford to Watford through services are taken to be the Lioness line;
  // the ones terminating at Willesden Junction are not.
  {operator: "LO", line: "LIO", calls: ["SBP", "HRW", "WFH", "WFJ"]},
  {operator: "LO", line: "MIL", calls: ["KPA", "SPB", "RMD", "SAT", "HDH", "CMD", "HKC", "SRA"]},
  {operator: "LO", line: "WIN", calls: ["DLJ", "SDC", "ZCW", "SQE", "NXG", "NWX", "SYD", "WCY", "CYP"]},
  {operator: "LO", line: "LIO", calls: ["EUS", "KBN", "QPW"]},

  {operator: "ME", line: "ME_Northern", calls: ["HNX", "LPY", "SDL", "BAH", "HLR", "SOP", "KKD", "WAO", "MAG", "OMS", "RIL", "KIR", "HBL", "AIN"]},
  {operator: "ME", line: "ME_Wirral", calls: ["BKQ", "NBN", "BID", "WKI", "RFY", "PSL", "HOO", "ELP", "CTR"]},

  {operator: "LT", line: "MET", calls: ["AMR", "ZCM", "RIC", "ZMP", "HOH", "ZBS"]},
  {operator: "LT", line: "DST", calls: ["RMD", "GUN", "ZTU"]},
  {operator: "LT", line: "BAK", calls: ["QPW", "SBP", "HRW"]},

  // No Yellow line service appears in the National Rail timetable, so there is
  // no rule for one.
  {operator: "TW", line: "GRN", calls: ["APN", "FEG", "REG", "SUN"]},
];

/**
 * The rules an operator has, in the order they are written. Built once: the
 * lookup happens per schedule, and there are hundreds of thousands of those.
 */
export const lineRulesByOperator: ReadonlyMap<AgencyID, readonly LineRule[]> = lineRules.reduce(
  (index, rule) => index.set(rule.operator, [...index.get(rule.operator) ?? [], rule]),
  new Map<AgencyID, LineRule[]>()
);

const BLACK = "000000";
const WHITE = "FFFFFF";

/**
 * Black or white, whichever can be read on the colour given.
 *
 * GTFS defaults `route_text_color` to black, which is unreadable on the darker
 * half of the palette above. The threshold is the WCAG 2.1 relative luminance
 * of a colour whose contrast with black and with white is equal.
 */
export function accessibleTextColor(hex: string): string {
  const channel = (offset: number) => parseInt(hex.substring(offset, offset + 2), 16) / 255;
  const linear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const luminance = 0.2126 * linear(channel(0)) + 0.7152 * linear(channel(2)) + 0.0722 * linear(channel(4));

  return luminance > 0.179 ? BLACK : WHITE;
}
