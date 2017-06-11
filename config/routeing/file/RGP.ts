
import Text from "../../../feed/field/Text";
import CSVRecord from "../../../feed/record/CSVRecord";
import SingleRecordFile from "../../../feed/file/SingleRecordFile";

const routeingPoint = new CSVRecord(
  "routeing_point",
  ["routeing_point"],
  {
    "routeing_point": new TextField(0, 3)
  }
);

const RGP = new SingleRecordFile(routeingPoint);

export default RGP;