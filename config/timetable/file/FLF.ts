
import {TextField, VariableLengthText} from "../../../src/feed/field/TextField";
import {IntField} from "../../../src/feed/field/IntField";
import {CSVRecord} from "../../../src/feed/record/CSVRecord";
import {MultiRecordFile} from "../../../src/feed/file/MultiRecordFile";

const fixedLink = new CSVRecord(
  "fixed_link",
  ["mode", "origin", "destination"], {
    "mode": new VariableLengthText(2, 10),
    "origin": new TextField(4, 3),
    "destination": new TextField(6, 3),
    "duration": new IntField(-2, 3, false, [])
  },
  [],
  " "
);

// Note - this is not really a multi record file, but it's an easy way to ignore the last line that states: END
const FLF = new MultiRecordFile({
  "A": fixedLink
}, 0);

export default FLF;