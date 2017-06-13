
import {FeedFile} from "../src/feed/file/FeedFile";
import fares from "./fares";
import routeing from "./routeing";
import timetable from "./timetable";

export type FeedConfig = {
  [fileExtension: string]: FeedFile
};

export default {
  fares: fares,
  routeing: routeing,
  timetable: timetable
};
