import {FixedWidthRecord, SingleRecordFile, TextField, VariableLengthText} from "@gb-rail/feed-parser";

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