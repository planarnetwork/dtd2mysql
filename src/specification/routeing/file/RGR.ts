
import {Map} from 'immutable';
import Text from "../../../feed/field/Text";
import Record from "../../../feed/record/Record";
import SingleRecordFile from "../../../feed/file/SingleRecordFile";
import VariableLengthText from "../../../feed/field/VariableLengthText";

const record = new Record(
  "permitted_route",
  [],
  Map({
    "start_routeing_point": new Text(0, 3),
    "end_routeing_point": new Text(4, 3),
    "map_code": new VariableLengthText(8, 150)
  })
);

const RGR = new SingleRecordFile(record);

export default RGR;