
import {Map} from 'immutable';
import Text from "../../../feed/field/Text";
import CSVRecord from "../../../feed/record/CSVRecord";
import SingleRecordFile from "../../../feed/file/SingleRecordFile";

const node = new CSVRecord(
  "routeing_node",
  ["node"],
  Map({
    "node": new Text(0, 3),
  })
);

const RGN = new SingleRecordFile(node);

export default RGN;