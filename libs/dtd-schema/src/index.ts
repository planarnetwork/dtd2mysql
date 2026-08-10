import {FeedFile} from "@gb-rail/feed-parser";
import fares from "./fares";
import routeing from "./routeing";
import timetable from "./timetable";
import nfm64, {downloadUrl} from "./nfm64";

export type FeedConfig = {
  [fileExtension: string]: FeedFile
};

export {downloadUrl};

export default {
  fares,
  routeing,
  timetable,
  nfm64
};
