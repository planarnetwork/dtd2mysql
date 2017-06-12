
import {FixedWidthRecord} from "../../../src/feed/record/FixedWidthRecord";
import {MultiRecordFile} from "../../../src/feed/file/MultiRecordFile";
import {TextField} from "../../../src/feed/field/TextField";
import {BooleanField} from "../../../src/feed/field/BooleanField";

const toc = new FixedWidthRecord(
  "toc",
  ["toc_id"],
  {
    "toc_id": new TextField(1, 2),
    "toc_name": new TextField(3, 30),
    "active": new BooleanField(41)
  }
);

const fare = new FixedWidthRecord(
  "toc_fare",
  ["fare_toc_id", "toc_id"],
  {
    "fare_toc_id": new TextField(1, 3),
    "toc_id": new TextField(4, 2, true),
    "fare_toc_name": new TextField(6, 30)
  }
);

const TOC = new MultiRecordFile({
  "T": toc,
  "F": fare
}, 0);

export default TOC;