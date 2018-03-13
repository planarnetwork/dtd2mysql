import {CSVRecord} from "../../../src/feed/record/CSVRecord";
import {SingleRecordFile} from "../../../src/feed/file/SingleRecordFile";
import {TextField, VariableLengthText} from "../../../src/feed/field/TextField";
import {FixedWidthRecord} from "../../../src/feed/record/FixedWidthRecord";

const record = new FixedWidthRecord(
  "easement_text",
  ["text_ref"],
  {
    "text_ref": new TextField(0, 6),
    "easement_text": new VariableLengthText(7, 2000)
  }
);

const RGE = new SingleRecordFile(record);

export default RGE;