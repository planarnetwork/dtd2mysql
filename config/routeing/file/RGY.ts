
import Text from "../../../feed/field/Text";
import CSVRecord from "../../../feed/record/CSVRecord";
import SingleRecordFile from "../../../feed/file/SingleRecordFile";
import DateField from "../../../feed/field/DateField";

const record = new CSVRecord(
  "location",
  ["uic_code", "nlc_code"],
  {
    "uic_code": new TextField(0, 3),
    "nlc_code": new TextField(1, 4),
    "group_code": new TextField(2, 4),
    "crs_code": new TextField(3, 3),
    "county_code": new TextField(4, 2),
    "zone_code": new TextField(5, 4, true),
    "start_date": new DateField(6),
    "end_date": new DateField(7),
  }
);

const RGY = new SingleRecordFile(record);

export default RGY;