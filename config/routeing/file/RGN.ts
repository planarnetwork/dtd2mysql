import {CSVRecord} from "../../../src/feed/record/CSVRecord";
import {SingleRecordFile} from "../../../src/feed/file/SingleRecordFile";
import {TextField} from "../../../src/feed/field/TextField";

const node = new CSVRecord(
  "routeing_node",
  ["node"],
  {
    "node": new TextField(0, 3),
  }
);

const RGN = new SingleRecordFile(node);

export default RGN;