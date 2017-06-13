
import {FixedWidthRecord} from "../../../src/feed/record/FixedWidthRecord";
import {TextField} from "../../../src/feed/field/TextField";
import {IntField} from "../../../src/feed/field/IntField";
import {MultiRecordFile} from "../../../src/feed/file/MultiRecordFile";

const physicalStation = new FixedWidthRecord(
  "physical_station",
  ["tiploc_code"], {
    "station_name": new TextField(5, 26),
    "cate_interchange_status": new IntField(35, 1, true, ["S"]), // hack for header
    "tiploc_code": new TextField(36, 7),
    "crs_reference_code": new TextField(43, 3, true),
    "crs_code": new TextField(49, 3, true),
    "minimum_change_time": new IntField(63, 2, false, [])
  }
);

const alias = new FixedWidthRecord(
  "alias",
  ["station_name"], {
    "station_name": new TextField(5, 26),
    "station_alias": new TextField(36, 26)
  }
);

const MSN = new MultiRecordFile({
  "A": physicalStation,
  "L": alias
}, 0);

export default MSN;