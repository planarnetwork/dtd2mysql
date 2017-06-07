
import {Map} from 'immutable';
import Text from "../../../feed/field/Text";
import CSVRecord from "../../../feed/record/CSVRecord";
import SingleRecordFile from "../../../feed/file/SingleRecordFile";

const station = new CSVRecord(
  "station_routeing_point",
  ["station_identifier"],
  Map({
    "station_identifier": new Text(0, 3),
    "routeing_point_1": new Text(1, 3, true),
    "routeing_point_2": new Text(2, 3, true),
    "routeing_point_3": new Text(3, 3, true),
    "routeing_point_4": new Text(4, 3, true),
    "station_group_id": new Text(5, 3, true)
  })
);

const RGS = new SingleRecordFile(station);


export default RGS;