
import Text from "../../../feed/field/Text";
import CSVRecord from "../../../feed/record/CSVRecord";
import Int from "../../../feed/field/Int";
import MultiRecordFile from "../../../feed/file/MultiRecordFile";
import ZeroFillInt from "../../../feed/field/ZeroFillInt";
import BooleanField from "../../../feed/field/BooleanField";

const londonRoute = new CSVRecord(
  "london_route",
  ["route_code"],
  {
    "route_code": new ZeroFillIntField(0, 5),
    "london_marker": new IntField(2, 1)
  }
);

const routeDate = new CSVRecord(
  "route_data",
  [],
  {
    "route_code": new TextField(0, 5),
    "entry_type": new TextField(2, 1),
    "crs_code": new TextField(3, 3),
    "group_mkr": new BooleanField(4),
    "mode_code": new ZeroFillIntField(5, 3, true),
    "toc_id": new TextField(6, 2, true),
  }
);

const RGK = new MultiRecordFile({
  "L": londonRoute,
  "D": routeDate,
}, 6);


export default RGK;