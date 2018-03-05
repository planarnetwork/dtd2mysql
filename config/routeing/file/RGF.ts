import {CSVRecord} from "../../../src/feed/record/CSVRecord";
import {TextField, VariableLengthText} from "../../../src/feed/field/TextField";
import {IntField} from "../../../src/feed/field/IntField";
import {DateField} from "../../../src/feed/field/DateField";
import {TimeField} from "../../../src/feed/field/TimeField";
import {MultiRecordFile} from "../../../src/feed/file/MultiRecordFile";
import {FixedWidthRecord} from "../../../src/feed/record/FixedWidthRecord";
import {BooleanField} from "../../../src/feed/field/BooleanField";

const easement = new FixedWidthRecord(
  "easement",
  ["easement_ref"],
  {
    "easement_ref": new TextField(2, 6),
    "start_date": new DateField(9),
    "end_date": new DateField(18),
    "text_ref": new TextField(27, 6),
    "easement_type": new IntField(34, 1),
    "easement_class": new IntField(36, 1),
    "category": new IntField(38, 1),
    "monday": new BooleanField(40),
    "tuesday": new BooleanField(41),
    "wednesday": new BooleanField(42),
    "thursday": new BooleanField(43),
    "friday": new BooleanField(44),
    "saturday": new BooleanField(45),
    "sunday": new BooleanField(46)
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