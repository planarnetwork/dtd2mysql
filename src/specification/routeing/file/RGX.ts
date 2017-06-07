
import {Map} from 'immutable';
import Text from "../../../feed/field/Text";
import CSVRecord from "../../../feed/record/CSVRecord";
import SingleRecordFile from "../../../feed/file/SingleRecordFile";
import DateField from "../../../feed/field/DateField";

const record = new CSVRecord(
  "new_station",
  ["nfm64_station_code", "new_station_code"],
  Map({
    "nfm64_station_code": new Text(0, 3),
    "new_station_code": new Text(1, 3),
    "start_date": new DateField(2),
    "end_date": new DateField(3),
  })
);

const RGX = new SingleRecordFile(record);

export default RGX;