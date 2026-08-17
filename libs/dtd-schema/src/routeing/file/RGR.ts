import {FixedWidthRecord, SingleRecordFile, TextField, VariableLengthText} from "@gb-transit/feed-parser";

const record = new FixedWidthRecord(
  "permitted_route",
  [],
  {
    "start_routeing_point": new TextField(0, 3),
    "end_routeing_point": new TextField(4, 3),
    "map_code": new VariableLengthText(8, 150)
  }
);

const RGR = new SingleRecordFile(record);

export default RGR;