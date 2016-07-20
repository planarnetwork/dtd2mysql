
import {Map} from 'immutable';
import Record from "../../../feed/record/Record";
import DateField from "../../../feed/field/DateField";
import Int from "../../../feed/field/Int";
import Text from "../../../feed/field/Text";
import SingleRecordFile from "../../../feed/file/SingleRecordFile";

const clusterRecord = new Record(
    "station_cluster",
    ["cluster_id", "cluster_nlc", "end_date"],
    Map({
        "cluster_id": new Text(1, 4),
        "cluster_nlc": new Text(5, 4),
        "end_date": new DateField(9),
        "start_date": new DateField(17)
    })
);

const FSC = new SingleRecordFile(clusterRecord);

export default FSC;