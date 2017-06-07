
import {Map} from 'immutable';
import Text from "../../../feed/field/Text";
import CSVRecord from "../../../feed/record/CSVRecord";
import SingleRecordFile from "../../../feed/file/SingleRecordFile";
import VariableLengthText from "../../../feed/field/VariableLengthText";

const record = new CSVRecord(
  "easement_text",
  ["text_ref"],
  Map({
    "text_ref": new Text(0, 6),
    "easement_text": new VariableLengthText(1, 2000)
  })
);

const RGE = new SingleRecordFile(record);

export default RGE;