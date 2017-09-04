import {CSVRecord} from "../../../src/feed/record/CSVRecord";
import {TextField, VariableLengthText} from "../../../src/feed/field/TextField";
import {IntField} from "../../../src/feed/field/IntField";
import {DateField} from "../../../src/feed/field/DateField";
import {TimeField} from "../../../src/feed/field/TimeField";
import {MultiRecordFile} from "../../../src/feed/file/MultiRecordFile";

const easement = new CSVRecord(
  "easement",
  ["easement_ref"],
  {
    "easement_ref": new TextField(1, 6),
    "start_date": new DateField(2),
    "end_date": new DateField(3),
    "text_ref": new TextField(4, 6),
    "easement_type": new IntField(5, 1),
    "easement_class": new IntField(6, 1),
    "category": new IntField(7, 1),
    "valid_days": new TextField(8, 7),
    "start_time": new TimeField(9, 4),
    "end_time": new TimeField(10, 4),
  }
);

const easementLocation = new CSVRecord(
  "easement_location",
  [],
  {
    "easement_ref": new TextField(1, 6),
    "location_code": new TextField(2, 3),
    "location_modifier": new IntField(3, 1),
  }
);

const easementDetail = new CSVRecord(
  "easement_detail",
  ["easement_ref", "detail_type", "detail_code"],
  {
    "easement_ref": new TextField(1, 6),
    "detail_type": new IntField(2, 1),
    "detail_code": new VariableLengthText(3, 8),
  }
);

const easementException = new CSVRecord(
  "easement_exception",
  ["easement_ref", "exception_type", "exception_code"],
  {
    "easement_ref": new TextField(1, 6),
    "exception_type": new IntField(2, 1),
    "exception_code": new VariableLengthText(3, 8),
  }
);

const RGF = new MultiRecordFile({
  "E": easement,
  "L": easementLocation,
  "D": easementDetail,
  "X": easementException,
}, 0);


export default RGF;