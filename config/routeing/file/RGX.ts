import {CSVRecord} from "../../../src/feed/record/CSVRecord";
import {SingleRecordFile} from "../../../src/feed/file/SingleRecordFile";
import {TextField} from "../../../src/feed/field/TextField";
import {DateField} from "../../../src/feed/field/DateField";

const record = new CSVRecord(
  "new_station",
  ["nfm64_station_code", "new_station_code"],
  {
    "nfm64_station_code": new TextField(0, 3),
    "new_station_code": new TextField(1, 3),
    "start_date": new DateField(2),
    "end_date": new DateField(3),
  }
);

const RGX = new SingleRecordFile(record);

export default RGX;