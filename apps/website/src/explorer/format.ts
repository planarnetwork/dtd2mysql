/**
 * Turning what the feed says into what a reader can judge.
 *
 * Every one of these is a place where showing the raw value would leave the reader doing arithmetic
 * to answer a question they can see the answer to: 88500 is not a time, 0 is not "nobody can board
 * here", and 20260910 is not a date to anyone who has not spent a while in this data.
 */

/** Seconds from the start of the service day, back as the feed writes them. 88500 is 24:35:00. */
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds % 60)}`;
}

/** The same, without the seconds, for a board where every value is a whole minute. */
export function formatClock(seconds: number): string {
  return `${pad(Math.floor(seconds / 3600) % 24)}:${pad(Math.floor((seconds % 3600) / 60))}`;
}

/** `20260904` as `4 Sep 2026`, which is how a date is read rather than stored. */
export function formatDate(yyyymmdd: number | string): string {
  const text = String(yyyymmdd);

  if (!/^\d{8}$/.test(text)) {
    return text;
  }

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = Number(text.slice(4, 6));

  return `${Number(text.slice(6, 8))} ${months[month - 1] ?? text.slice(4, 6)} ${text.slice(0, 4)}`;
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function weekdayOf(yyyymmdd: number): string {
  const text = String(yyyymmdd);
  const date = new Date(Date.UTC(
    Number(text.slice(0, 4)), Number(text.slice(4, 6)) - 1, Number(text.slice(6, 8))
  ));

  return WEEKDAYS[date.getUTCDay()] ?? "";
}

/**
 * What a pickup_type or drop_off_type means, said rather than numbered.
 *
 * The distinction that matters for this feed is 1: a call a train makes where nobody may board is
 * an operational stop, and a reader looking at a train that appears not to serve a station it
 * clearly calls at needs to be told that in words.
 */
export function pickupOf(type: number): string {
  switch (type) {
    case 0: return "passengers may board";
    case 1: return "nobody may board";
    case 2: return "board by arrangement with the operator";
    case 3: return "board by arrangement with the driver";
    default: return `unknown (${type})`;
  }
}

export function dropOffOf(type: number): string {
  switch (type) {
    case 0: return "passengers may alight";
    case 1: return "nobody may alight";
    case 2: return "alight by arrangement with the operator";
    case 3: return "alight by arrangement with the driver";
    default: return `unknown (${type})`;
  }
}

/** location_type, which is what separates a station from the platforms under it. */
export function locationOf(type: string | undefined): string {
  switch (type) {
    case undefined:
    case "":
    case "0": return "boarding point";
    case "1": return "station";
    case "2": return "entrance";
    case "3": return "generic node";
    case "4": return "boarding area";
    default: return `unknown (${type})`;
  }
}

export function transferOf(type: string | undefined): string {
  switch (type) {
    case "0": return "recommended interchange";
    case "1": return "timed interchange";
    case "2": return "interchange needing a minimum time";
    case "3": return "interchange not possible";
    case "4": return "the same vehicle carries on";
    case "5": return "in-seat transfer not allowed";
    default: return `unknown (${type})`;
  }
}

/** route_type, of which a GB rail feed uses only a few. */
export function routeTypeOf(type: string | undefined): string {
  switch (type) {
    case "0": return "tram";
    case "1": return "metro";
    case "2": return "rail";
    case "3": return "bus";
    case "4": return "ferry";
    case "5": return "cable tram";
    case "6": return "aerial lift";
    case "7": return "funicular";
    case "11": return "trolleybus";
    case "12": return "monorail";
    default: return type === undefined ? "unstated" : `unknown (${type})`;
  }
}

export function number(value: number): string {
  return value.toLocaleString("en-GB");
}

export function bytes(value: number): string {
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${Math.round(value / 1024)} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * The metres between two coordinates.
 *
 * The equirectangular approximation rather than the haversine: over the tens or hundreds of metres
 * these are ever compared across it agrees to well within the precision the feed has, and the
 * question being asked is "is this station in the right place", not navigation.
 */
export function metresBetween(
  fromLat: number, fromLon: number, toLat: number, toLon: number
): number {
  const radians = Math.PI / 180;
  const x = (toLon - fromLon) * radians * Math.cos((fromLat + toLat) * radians / 2);
  const y = (toLat - fromLat) * radians;

  return Math.round(Math.sqrt(x * x + y * y) * 6371000);
}

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}
