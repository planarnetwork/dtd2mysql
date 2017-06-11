import {CSVRecord} from "../../../src/feed/record/CSVRecord";
import {SingleRecordFile} from "../../../src/feed/file/SingleRecordFile";
import {TextField} from "../../../src/feed/field/TextField";

const record = new CSVRecord(
  "link",
  ["start_node", "end_node", "map_code"],
  {
    "start_node": new TextField(0, 3),
    "end_node": new TextField(1, 3),
    "map_code": new TextField(2, 2),
  }
);

const RGL = new SingleRecordFile(record);

export default RGL;