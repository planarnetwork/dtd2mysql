
import {CSVRecord} from "../../../src/feed/record/CSVRecord";
import {SingleRecordFile} from "../../../src/feed/file/SingleRecordFile";
import {TextField} from "../../../src/feed/field/TextField";
import {DoubleField} from "../../../src/feed/field/DoubleField";

const record = new CSVRecord(
  "station_link",
  ["start_station", "end_station"],
  {
    "start_station": new TextField(0, 3),
    "end_station": new TextField(1, 3),
    "distance": new DoubleField(2, 5, 5)
  }
);

const RGD = new SingleRecordFile(record);

export default RGD;