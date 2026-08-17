import {CSVRecord, SingleRecordFile, TextField} from "@gb-transit/feed-parser";

const stationGroup = new CSVRecord(
  "station_group",
  ["station_group_id"],
  {
    "station_group_id": new TextField(0, 3),
    "main_station": new TextField(1, 3),
  }
);

const RGG = new SingleRecordFile(stationGroup);

export default RGG;