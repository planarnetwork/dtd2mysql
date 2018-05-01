
import {FeedConfig} from "../index";
import MSN from "./file/MSN";
import FLF from "./file/FLF";
import MCA from "./file/MCA";
import ZTR from "./file/ZTR";
import ALF from "./file/ALF";
import CFA from "./file/CFA";

const specification: FeedConfig = {
  "MSN": MSN,
  "FLF": FLF,
  "MCA": MCA,
  "ZTR": ZTR,
  "ALF": ALF,
  "CFA": CFA
};

export default specification;