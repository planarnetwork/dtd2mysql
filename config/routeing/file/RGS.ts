
import Text from "../../../feed/field/Text";
import CSVRecord from "../../../feed/record/CSVRecord";
import SingleRecordFile from "../../../feed/file/SingleRecordFile";

const station = new CSVRecord(
  "station_routeing_point",
  ["station_identifier"],
  {
    "station_identifier": new TextField(0, 3),
    "routeing_point_1": new TextField(1, 3, true),
    "routeing_point_2": new TextField(2, 3, true),
    "routeing_point_3": new TextField(3, 3, true),
    "routeing_point_4": new TextField(4, 3, true),
    "station_group_id": new TextField(5, 3, true)
  }
);

const RGS = new SingleRecordFile(station);


export default RGS;