
import {Map} from 'immutable';
import Text from "../../../feed/field/Text";
import CSVRecord from "../../../feed/record/CSVRecord";
import SingleRecordFile from "../../../feed/file/SingleRecordFile";
import BooleanField from "../../../feed/field/BooleanField";

const record = new CSVRecord(
  "london_station",
  ["crs_code"],
  Map({
    "crs_code": new Text(0, 3),
    "lt_marker": new BooleanField(1),
    "xlondon_marker": new BooleanField(2)
  })
);

const RGC = new SingleRecordFile(record);

export default RGC;