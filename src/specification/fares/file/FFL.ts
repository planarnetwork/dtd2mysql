
import {Map} from 'immutable';
import Record from "../../../feed/record/Record";
import ZeroFillInt from "../../../feed/field/ZeroFillInt";
import DateField from "../../../feed/field/DateField";
import Int from "../../../feed/field/Int";
import Text from "../../../feed/field/Text";
import MultiRecordFile from "../../../feed/file/MultiRecordFile";

const flowRecord = new Record(
    "flow",
    ["origin_code", "destination_code", "route_code", "status_code", "usage_code", "direction", "end_date"],
    Map({
        "origin_code": new Text(2, 4),
        "destination_code": new Text(6, 4),
        "route_code": new ZeroFillInt(10, 5),
        "status_code": new ZeroFillInt(15, 3),
        "usage_code": new Text(18, 1),
        "direction": new Text(19, 1),
        "end_date": new DateField(20),
        "start_date": new DateField(28),
        "toc": new Text(36, 3),
        "cross_london_ind": new Int(39, 1),
        "ns_disc_ind": new Int(40, 1),
        "publication_ind": new Text(41, 1),
        "flow_id": new Int(42, 7),
    })
);

const fareRecord = new Record(
    "fare",
    ["flow_id", "ticket_code"],
    Map({
        "flow_id": new Int(2, 7),
        "ticket_code": new Text(9, 3),
        "fare": new Int(12, 8),
        "restriction_code": new Text(20, 2)
    })
);

const FFL = new MultiRecordFile(Map({
    "F": flowRecord,
    "T": fareRecord
}));

export default FFL;