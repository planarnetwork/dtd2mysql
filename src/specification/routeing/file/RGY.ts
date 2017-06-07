
import {Map} from 'immutable';
import Text from "../../../feed/field/Text";
import CSVRecord from "../../../feed/record/CSVRecord";
import SingleRecordFile from "../../../feed/file/SingleRecordFile";
import DateField from "../../../feed/field/DateField";

const record = new CSVRecord(
  "location",
  ["uic_code", "nlc_code"],
  Map({
    "uic_code": new Text(0, 3),
    "nlc_code": new Text(1, 4),
    "group_code": new Text(2, 4),
    "crs_code": new Text(3, 3),
    "county_code": new Text(4, 2),
    "zone_code": new Text(5, 4, true),
    "start_date": new DateField(6),
    "end_date": new DateField(7),
  })
);

const RGY = new SingleRecordFile(record);

export default RGY;