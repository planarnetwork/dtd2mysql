import {CSVRecord} from "../../../src/feed/record/CSVRecord";
import {IntField, ZeroFillIntField} from "../../../src/feed/field/IntField";
import {TextField} from "../../../src/feed/field/TextField";
import {BooleanField} from "../../../src/feed/field/BooleanField";
import {MultiRecordFile} from "../../../src/feed/file/MultiRecordFile";

const londonRoute = new CSVRecord(
  "london_route",
  ["route_code"],
  {
    "route_code": new ZeroFillIntField(0, 5),
    "london_marker": new IntField(2, 1)
  }
);

const routeData = new CSVRecord(
  "route_data",
  [],
  {
    "route_code": new TextField(0, 5),
    "entry_type": new TextField(2, 1),
    "crs_code": new TextField(3, 3, true),
    "group_mkr": new BooleanField(4),
    "mode_code": new ZeroFillIntField(5, 3, true, [" "]),
    "toc_id": new TextField(6, 2, true),
  }
);

const RGK = new MultiRecordFile({
  "L": londonRoute,
  "D": routeData,
}, 6);


export default RGK;