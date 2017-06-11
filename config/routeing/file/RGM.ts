import {CSVRecord} from "../../../src/feed/record/CSVRecord";
import {SingleRecordFile} from "../../../src/feed/file/SingleRecordFile";
import {TextField} from "../../../src/feed/field/TextField";

const record = new CSVRecord(
  "map",
  ["map_identifier"],
  {
    "map_identifier": new TextField(0, 2)
  }
);

const RGM = new SingleRecordFile(record);

export default RGM;