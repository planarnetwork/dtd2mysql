
import Text from "../../../feed/field/Text";
import CSVRecord from "../../../feed/record/CSVRecord";
import DateField from "../../../feed/field/DateField";
import Int from "../../../feed/field/Int";
import Time from "../../../feed/field/Time";
import MultiRecordFile from "../../../feed/file/MultiRecordFile";
import VariableLengthText from "../../../feed/field/VariableLengthText";

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
    "start_time": new Time(9, true),
    "end_time": new Time(10, true),
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
    "detail_code": new VariableLengthTextField(3, 8),
  }
);

const easementException = new CSVRecord(
  "easement_exception",
  ["easement_ref", "exception_type", "exception_code"],
  {
    "easement_ref": new TextField(1, 6),
    "exception_type": new IntField(2, 1),
    "exception_code": new VariableLengthTextField(3, 8),
  }
);


const RGF = new MultiRecordFile({
  "E": easement,
  "L": easementLocation,
  "D": easementDetail,
  "X": easementException,
}, 0);


export default RGF;