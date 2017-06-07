
import {Map} from 'immutable';
import Text from "../../../feed/field/Text";
import CSVRecord from "../../../feed/record/CSVRecord";
import SingleRecordFile from "../../../feed/file/SingleRecordFile";
import Double from "../../../feed/field/Double";

const record = new CSVRecord(
  "station_link",
  ["start_station", "end_station"],
  Map({
    "start_station": new Text(0, 3),
    "end_station": new Text(1, 3),
    "distance": new Double(2, 5, 5)
  })
);

const RGD = new SingleRecordFile(record);

export default RGD;