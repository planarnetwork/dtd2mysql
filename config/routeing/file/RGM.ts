
import Text from "../../../feed/field/Text";
import CSVRecord from "../../../feed/record/CSVRecord";
import SingleRecordFile from "../../../feed/file/SingleRecordFile";

const record = new CSVRecord(
  "map",
  ["map_identifier"],
  {
    "map_identifier": new TextField(0, 2)
  }
);

const RGM = new SingleRecordFile(record);

export default RGM;