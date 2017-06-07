
import {Map} from 'immutable';
import Text from "../../../feed/field/Text";
import CSVRecord from "../../../feed/record/CSVRecord";
import SingleRecordFile from "../../../feed/file/SingleRecordFile";

const stationGroup = new CSVRecord(
  "station_group",
  ["station_group_id"],
  Map({
    "station_group_id": new Text(0, 3),
    "main_station": new Text(1, 3),
  })
);

const RGG = new SingleRecordFile(stationGroup);

export default RGG;