import {StopID} from "./Stop";

/**
 * A flat, named set of stops - GTFS Fares v2.
 *
 * This is where a station group goes. GTFS has no station-of-stations:
 * `parent_station` is forbidden on a `location_type=1` station and the
 * hierarchy is exactly one level deep, so "London Terminals" cannot be modelled
 * as a station containing Euston and Waterloo.
 *
 * An area has no nesting rules and no exclusivity, which is what the source
 * data actually needs - a station sits in London Terminals and a travelcard
 * zone at the same time, and neither contains the other.
 *
 * `transfers.txt` is the wrong tool for the same job: it asserts a rider can
 * get between the two stops, which is false for Euston and Waterloo.
 */
export interface Area {
  area_id: AreaID;
  /**
   * Optional in the spec, always written here. An area with no name is a
   * four digit code in a file with no other clue what it means.
   */
  area_name: string;
}

/**
 * The identifier an area is published under. A group station's is its NLC.
 */
export type AreaID = string;

/**
 * One stop's membership of one area. A stop may appear in several.
 */
export interface StopArea {
  area_id: AreaID;
  stop_id: StopID;
}

/**
 * areas.txt, as it is written. Every field of Area is a column of it.
 */
export type AreaRow = Area;

/**
 * stop_areas.txt, as it is written.
 */
export type StopAreaRow = StopArea;
