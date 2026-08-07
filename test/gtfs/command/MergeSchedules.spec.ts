import * as chai from "chai";
import {describe, it, expect} from 'vitest';
import {STP, TUID} from "../../../src/gtfs/native/OverlayRecord";
import {mergeSchedules} from "../../../src/gtfs/command/MergeSchedules";
import {applyOverlays} from "../../../src/gtfs/command/ApplyOverlays";
import {Days, ScheduleCalendar} from "../../../src/gtfs/native/ScheduleCalendar";
import {StopTime} from "../../../src/gtfs/file/StopTime";
import {Schedule} from "../../../src/gtfs/native/Schedule";
import {RouteType} from "../../../src/gtfs/file/Route";

const ALL_DAYS: Days = { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 };

export function schedule(id: number,
                         tuid: TUID,
                         from: string,
                         to: string,
                         stp: STP = STP.Overlay,
                         days: Days = ALL_DAYS,
                         stops: StopTime[] = []): Schedule {

  return new Schedule(
    id,
    stops,
    tuid,
    "",
    new ScheduleCalendar(
      Temporal.PlainDate.from(from),
      Temporal.PlainDate.from(to),
      days,
      {}
    ),
    RouteType.Rail,
    "LN",
    stp,
    true,
    true
  );
}
