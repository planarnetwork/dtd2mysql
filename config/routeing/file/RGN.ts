import {CSVRecord, SingleRecordFile, TextField} from "@gb-rail/feed-parser";

const node = new CSVRecord(
  "routeing_node",
  ["node"],
  {
    "node": new TextField(0, 3),
  }
);

const RGN = new SingleRecordFile(node);

export default RGN;