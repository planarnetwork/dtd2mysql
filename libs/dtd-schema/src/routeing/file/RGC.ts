
import {BooleanField, CSVRecord, SingleRecordFile, TextField} from "@gb-rail/feed-parser";

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