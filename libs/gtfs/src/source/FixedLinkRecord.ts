import {CRS} from "../entity/Stop";
import {Duration} from "../model/Duration";
import {FixedLink} from "../entity/FixedLink";

/**
 * A fixed link as the feed describes it: one direction, with the dates optional.
 */
export interface FixedLinkRecord {
  mode: string;
  duration: Duration;
  origin: CRS;
  destination: CRS;
  start_time: string;
  end_time: string;
  start_date: string | null;
  end_date: string | null;
  monday: 0 | 1;
  tuesday: 0 | 1;
  wednesday: 0 | 1;
  thursday: 0 | 1;
  friday: 0 | 1;
  saturday: 0 | 1;
  sunday: 0 | 1;
}

/**
 * A fixed link is walkable both ways, so each record becomes two rows.
 */
export function toFixedLinks(row: FixedLinkRecord): [FixedLink, FixedLink] {
  return [
    toFixedLink(row.origin, row.destination, row),
    toFixedLink(row.destination, row.origin, row)
  ];
}

function toFixedLink(origin: CRS, destination: CRS, row: FixedLinkRecord): FixedLink {
  return {
    from_stop_id: origin,
    to_stop_id: destination,
    mode: row.mode,
    duration: row.duration,
    start_time: row.start_time,
    end_time: row.end_time,
    start_date: (row.start_date || "2017-01-01"),
    end_date: (row.end_date || "2038-01-19"),
    monday: row.monday,
    tuesday: row.tuesday,
    wednesday: row.wednesday,
    thursday: row.thursday,
    friday: row.friday,
    saturday: row.saturday,
    sunday: row.sunday
  };
}
