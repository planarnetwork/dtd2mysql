
import {FixedWidthRecord} from "../../../src/feed/record/FixedWidthRecord";
import {SingleRecordFile} from "../../../src/feed/file/SingleRecordFile";
import {TextField} from "../../../src/feed/field/TextField";
import {DateField} from "../../../src/feed/field/DateField";

const clusterFixedWidthRecord = new FixedWidthRecord(
  "station_cluster",
  ["cluster_id", "cluster_nlc", "end_date"],
  {
    "cluster_id": new TextField(1, 4),
    "cluster_nlc": new TextField(5, 4),
    "end_date": new DateField(9),
    "start_date": new DateField(17)
  }
);

const FSC = new SingleRecordFile(clusterFixedWidthRecord);

export default FSC;