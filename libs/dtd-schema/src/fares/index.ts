import {FeedConfig} from "../index";
import FFL from "./file/FFL";
import FSC from "./file/FSC";
import NDF from "./file/NDF";
import NFO from "./file/NFO";
import FNS from "./file/FNS";
import TTY from "./file/TTY";
import LOC from "./file/LOC";
import RCM from "./file/RCM";
import RTE from "./file/RTE";
import SUP from "./file/SUP";
import DIS from "./file/DIS";
import RLC from "./file/RLC";
import TSP from "./file/TSP";
import RST from "./file/RST";
import TAP from "./file/TAP";
import TOC from "./file/TOC";
import TVL from "./file/TVL";
import TRR from "./file/TRR";
import TPK from "./file/TPK";

const specification: FeedConfig = {
  DIS: DIS,
  FFL: FFL,
  FNS: FNS,
  FSC: FSC,
  LOC: LOC,
  NDF: NDF,
  NFO: NFO,
  RCM: RCM,
  RLC: RLC,
  RST: RST,
  RTE: RTE,
  SUP: SUP,
  TAP: TAP,
  TOC: TOC,
  TPK: TPK,
  TRR: TRR,
  TSP: TSP,
  TTY: TTY,
  TVL: TVL
};

export default specification;