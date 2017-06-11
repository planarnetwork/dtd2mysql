
import Text from "../../../feed/field/Text";
import CSVRecord from "../../../feed/record/CSVRecord";
import SingleRecordFile from "../../../feed/file/SingleRecordFile";
import VariableLengthText from "../../../feed/field/VariableLengthText";

const record = new CSVRecord(
  "easement_text",
  ["text_ref"],
  {
    "text_ref": new TextField(0, 6),
    "easement_text": new VariableLengthTextField(1, 2000)
  }
);

const RGE = new SingleRecordFile(record);

export default RGE;