
import {CSVRecord, DoubleField, SingleRecordFile, TextField} from "@gb-transit/feed-parser";

const record = new CSVRecord(
  "station_link",
  ["start_station", "end_station"],
  {
    "start_station": new TextField(0, 3),
    "end_station": new TextField(1, 3),
    "distance": new DoubleField(2, 7, 4)
  }
);

const RGD = new SingleRecordFile(record);

export default RGD;