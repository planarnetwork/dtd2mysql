import {CSVRecord, SingleRecordFile, TextField} from "@gb-transit/feed-parser";

const record = new CSVRecord(
  "map",
  ["map_identifier"],
  {
    "map_identifier": new TextField(0, 2)
  }
);

const RGM = new SingleRecordFile(record);

export default RGM;