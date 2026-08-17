import {CSVRecord, SingleRecordFile, TextField} from "@gb-transit/feed-parser";

const routeingPoint = new CSVRecord(
  "routeing_point",
  ["routeing_point"],
  {
    "routeing_point": new TextField(0, 3)
  }
);

const RGP = new SingleRecordFile(routeingPoint);

export default RGP;