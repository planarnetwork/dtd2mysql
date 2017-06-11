
import Text from "../../../feed/field/Text";
import Record from "../../../feed/record/Record";
import SingleRecordFile from "../../../feed/file/SingleRecordFile";
import VariableLengthText from "../../../feed/field/VariableLengthText";

const record = new Record(
  "permitted_route",
  [],
  {
    "start_routeing_point": new TextField(0, 3),
    "end_routeing_point": new TextField(4, 3),
    "map_code": new VariableLengthTextField(8, 150)
  }
);

const RGR = new SingleRecordFile(record);

export default RGR;