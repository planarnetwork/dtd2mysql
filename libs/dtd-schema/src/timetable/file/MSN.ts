
import {FixedWidthRecord, IntField, MultiRecordFile, TextField} from "@gb-transit/feed-parser";

const physicalStation = new FixedWidthRecord(
  "physical_station",
  ["tiploc_code"], {
    "station_name": new TextField(5, 26),
    // Blank where a station is not an interchange, and 9 where it is a
    // subsidiary location. Deliberately narrower than IntField's default of
    // [" ", "*", "9"]: 9 is a value this field takes, not an absence, and
    // treating it as one drops those stations out of transfers.txt.
    "cate_interchange_status": new IntField(35, 1, true, [" "]),
    "tiploc_code": new TextField(36, 7),
    "crs_reference_code": new TextField(43, 3, true),
    "crs_code": new TextField(49, 3, true),
    // The actual easting is (easting - 10000) * 100. An all-zero field is the
    // feed saying it has no coordinate, not a coordinate of zero: unwound and
    // projected it lands in the South Atlantic, which is where 43 CIE stations
    // have been sitting.
    "easting": new IntField(52, 5, true, [" ", "0"]),
    // The actual northing is (northing - 60000) * 100
    "northing": new IntField(58, 5, true, [" ", "0"]),
    "minimum_change_time": new IntField(63, 2, false, [])
  },
  ["crs_code"]
);

const alias = new FixedWidthRecord(
  "alias",
  ["station_name"], {
    "station_name": new TextField(5, 26),
    "station_alias": new TextField(36, 26)
  }
);

/**
 * The file opens with a record that begins with A, like every station, and holds
 * the file specification rather than a place. Read as a station it becomes a
 * stop with a name of "F", a code of "PEC=05" and coordinates in the South
 * Atlantic, so it is rejected before any field is parsed.
 *
 * The footer is excluded by its own first character already, since "E" is not a
 * record type. It is named here anyway so this one place says what the file
 * wraps its records in.
 */
const isRecord = (line: string) => !line.includes("FILE-SPEC") && !line.startsWith("End of File");

const MSN = new MultiRecordFile({
  "A": physicalStation,
  "L": alias
}, 0, 1, isRecord);

export default MSN;
