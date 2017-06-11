
import Text from "../../../feed/field/Text";
import CSVRecord from "../../../feed/record/CSVRecord";
import SingleRecordFile from "../../../feed/file/SingleRecordFile";

const node = new CSVRecord(
  "routeing_node",
  ["node"],
  {
    "node": new TextField(0, 3),
  }
);

const RGN = new SingleRecordFile(node);

export default RGN;