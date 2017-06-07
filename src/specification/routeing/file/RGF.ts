
import {Map} from 'immutable';
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
  Map({
    "easement_ref": new Text(1, 6),
    "start_date": new DateField(2),
    "end_date": new DateField(3),
    "text_ref": new Text(4, 6),
    "easement_type": new Int(5, 1),
    "easement_class": new Int(6, 1),
    "category": new Int(7, 1),
    "valid_days": new Text(8, 7),
    "start_time": new Time(9, true),
    "end_time": new Time(10, true),
  })
);

const easementLocation = new CSVRecord(
  "easement_location",
  [],
  Map({
    "easement_ref": new Text(1, 6),
    "location_code": new Text(2, 3),
    "location_modifier": new Int(3, 1),
  })
);

const easementDetail = new CSVRecord(
  "easement_detail",
  ["easement_ref", "detail_type", "detail_code"],
  Map({
    "easement_ref": new Text(1, 6),
    "detail_type": new Int(2, 1),
    "detail_code": new VariableLengthText(3, 8),
  })
);

const easementException = new CSVRecord(
  "easement_exception",
  ["easement_ref", "exception_type", "exception_code"],
  Map({
    "easement_ref": new Text(1, 6),
    "exception_type": new Int(2, 1),
    "exception_code": new VariableLengthText(3, 8),
  })
);


const RGF = new MultiRecordFile(Map({
  "E": easement,
  "L": easementLocation,
  "D": easementDetail,
  "X": easementException,
}), 0);


export default RGF;