// The TransXChange documents a feed is made of, and the pipeline that turns one
// into the rows of a GTFS feed. The GB bus counterpart to @gb-transit/dtd-source.

// Reading the input: a file, a zip, or a zip of zips, parsed into TransXChange
export {FileStream} from "./xml/FileStream";
export {XMLStream} from "./xml/XMLStream";
export type {ParseXML} from "./xml/XMLStream";
export {TransXChangeStream} from "./transxchange/TransXChangeStream";
export {daysOfWeekIndex} from "./transxchange/TransXChangeStream";
export type {JourneyPatternIndex} from "./transxchange/TransXChangeStream";

// The TransXChange model
export type {
  TransXChange, RouteLinks, JourneyPatternSections, JPTimingLinks, JourneyPatternSectionID,
  StopPoint, Location, RouteLink, JPTimingLink, VJTimingLink, JPJourneyStop
} from "./transxchange/TransXChange";
export {TimingStatus} from "./transxchange/TransXChange";

// A journey, which is what a trip and its calendar are built from
export {TransXChangeJourneyStream} from "./transxchange/TransXChangeJourneyStream";
export type {
  BankHolidays, TransXChangeJourney, JourneyCalendar, StopTime
} from "./transxchange/TransXChangeJourneyStream";

// The rows of each GTFS file, one stream per file
export {GTFSFileStream} from "./gtfs/GTFSFileStream";
export {AgencyStream} from "./gtfs/AgencyStream";
export {CalendarDatesStream} from "./gtfs/CalendarDatesStream";
export {CalendarStream} from "./gtfs/CalendarStream";
export {RoutesStream} from "./gtfs/RoutesStream";
export {ShapesStream} from "./gtfs/ShapesStream";
export {StopTimesStream} from "./gtfs/StopTimesStream";
export {StopsStream} from "./gtfs/StopsStream";
export {TransfersStream} from "./gtfs/TransfersStream";
export {TripsStream} from "./gtfs/TripsStream";

// Reference data the conversion needs and TransXChange does not carry
export {getBankHolidays, getBankHolidaysForRange} from "./reference/BankHolidays";
export {NaPTANFactory} from "./reference/NaPTAN";
export type {ATCOCode, NaPTANIndex, StopLocationIndex} from "./reference/NaPTAN";
export {GetStopData} from "./reference/GetStopData";
