
import {Map} from 'immutable';
import Text from "../../../feed/field/Text";
import CSVRecord from "../../../feed/record/CSVRecord";
import Int from "../../../feed/field/Int";
import MultiRecordFile from "../../../feed/file/MultiRecordFile";
import ZeroFillInt from "../../../feed/field/ZeroFillInt";
import BooleanField from "../../../feed/field/BooleanField";

const londonRoute = new CSVRecord(
  "london_route",
  ["route_code"],
  Map({
    "route_code": new ZeroFillInt(0, 5),
    "london_marker": new Int(2, 1)
  })
);

const routeDate = new CSVRecord(
  "route_data",
  [],
  Map({
    "route_code": new Text(0, 5),
    "entry_type": new Text(2, 1),
    "crs_code": new Text(3, 3),
    "group_mkr": new BooleanField(4),
    "mode_code": new ZeroFillInt(5, 3, true),
    "toc_id": new Text(6, 2, true),
  })
);

const RGK = new MultiRecordFile(Map({
  "L": londonRoute,
  "D": routeDate,
}), 6);


export default RGK;