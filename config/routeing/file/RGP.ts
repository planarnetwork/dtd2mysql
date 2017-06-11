import {CSVRecord} from "../../../src/feed/record/CSVRecord";
import {SingleRecordFile} from "../../../src/feed/file/SingleRecordFile";
import {TextField} from "../../../src/feed/field/TextField";

const routeingPoint = new CSVRecord(
  "routeing_point",
  ["routeing_point"],
  {
    "routeing_point": new TextField(0, 3)
  }
);

const RGP = new SingleRecordFile(routeingPoint);

export default RGP;