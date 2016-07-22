
import {Map} from 'immutable';
import Record from "../../../feed/record/Record";
import ZeroFillInt from "../../../feed/field/ZeroFillInt";
import DateField from "../../../feed/field/DateField";
import Int from "../../../feed/field/Int";
import Text from "../../../feed/field/Text";
import MultiRecordFile from "../../../feed/file/MultiRecordFile";

const toc = new Record(
    "toc",
    ["toc_id"],
    Map({
        "toc_id": new Text(1, 2),
        "toc_name": new Text(3, 30),
        "active": new Text(41, 1)
    })
);

const fare = new Record(
    "toc_fare",
    ["fare_toc_id", "toc_id"],
    Map({
        "fare_toc_id": new Text(1, 3),
        "toc_id": new Text(4, 2),
        "fare_toc_name": new Text(6, 30)
    })
);

const TOC = new MultiRecordFile(Map({
    "T": toc,
    "F": fare
}), 0);

export default TOC;