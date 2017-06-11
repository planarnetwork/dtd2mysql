
import {SingleRecordFile} from "../../../src/feed/file/SingleRecordFile";
import {TextField} from "../../../src/feed/field/TextField";
import {BooleanField} from "../../../src/feed/field/BooleanField";
import {CSVRecord} from "../../../src/feed/record/CSVRecord";

const record = new CSVRecord(
  "london_station",
  ["crs_code"],
  {
    "crs_code": new TextField(0, 3),
    "lt_marker": new BooleanField(1),
    "xlondon_marker": new BooleanField(2)
  }
);

const RGC = new SingleRecordFile(record);

export default RGC;