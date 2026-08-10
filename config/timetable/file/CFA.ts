
import {MultiRecordFile} from "@gb-rail/feed-parser";
import {association, stop, extraDetails, schedule, tiplocInsert} from "./MCA";

const CFA = new MultiRecordFile({
  "AA": association,
  "TI": tiplocInsert,
  "TA": tiplocInsert,
  "BS": schedule,
  "BX": extraDetails,
  "LO": stop,
  "LI": stop,
  "LT": stop
}, 0, 2);

export default CFA;