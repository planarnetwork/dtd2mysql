// GTFS entities - the shape of each output file
export type {Agency, AgencyID, AgencyRow} from "./entity/Agency";
export type {Area, AreaID, AreaRow, StopArea, StopAreaRow} from "./entity/Area";
export type {AttributionRole, AttributionRow} from "./entity/Attribution";
export type {Calendar, CalendarRow} from "./entity/Calendar";
export type {CalendarDate, CalendarDateRow} from "./entity/CalendarDate";
export type {FixedLink, FixedLinkRow} from "./entity/FixedLink";
export {RouteType} from "./entity/Route";
export type {Route, RouteID, RouteRow} from "./entity/Route";
export type {Stop, StopRow, CRS, TIPLOC} from "./entity/Stop";
export type {StopTime, StopTimeRow, Platform} from "./entity/StopTime";
export {TransferType} from "./entity/Transfer";
export type {Transfer, TransferRow, StopID} from "./entity/Transfer";
export type {Trip, TripRow} from "./entity/Trip";
export type {FeedInfo, FeedInfoRow} from "./entity/FeedInfo";
export type {FeedRow} from "./entity/FeedRow";

// The transit model - pure domain objects with no IO
export {Association, AssociationType, DateIndicator} from "./model/Association";
export type {AssociationApplication, AssociationLink} from "./model/Association";
export {SECONDS_IN_DAY, formatDuration, parseDuration} from "./model/Duration";
export type {Duration} from "./model/Duration";
export {STP} from "./model/OverlayRecord";
export type {IdGenerator, OverlayRecord, RSID, TUID} from "./model/OverlayRecord";
export {compare, dayOfWeek, maxDate, minDate, toYYYYMMDD} from "./model/PlainDate";
export type {DayOfWeek} from "./model/PlainDate";
export {Schedule, tripId} from "./model/Schedule";
export {NO_DAYS, OverlapType, ScheduleCalendar} from "./model/ScheduleCalendar";
export type {BankHoliday, Days, ExcludeDays} from "./model/ScheduleCalendar";

// Transforms - overlays, associations, merging and calendars
export {shiftLateNightServices} from "./transform/ShiftLateNightServices";
export {applyAssociations} from "./transform/ApplyAssociations";
export type {AssociatedSchedules, AssociationIndex, ScheduleIndex} from "./transform/ApplyAssociations";
export {combinedHeadsigns, onwardHeadsigns} from "./transform/Headsigns";
export {linkedTrips, resolveLinks} from "./transform/LinkedTrips";
export type {TripLink} from "./transform/LinkedTrips";
export {applyOverlays} from "./transform/ApplyOverlays";
export type {OverlayIndex} from "./transform/ApplyOverlays";
export {createCalendar} from "./transform/CreateCalendar";
export type {HasCalendar, ServiceIdIndex} from "./transform/CreateCalendar";
export type {Frequency} from "./transform/Frequency";
export {mergeSchedules} from "./transform/MergeSchedules";

// Transforms - what the feed publishes, and the identifiers it publishes it by
export {TIMETABLE_ATTRIBUTION, createAttributions} from "./transform/CreateAttributions";
export {createFeedInfo} from "./transform/CreateFeedInfo";
export {dropUnknownStops} from "./transform/DropUnknownStops";
export {interchange, mergeTransfers} from "./transform/MergeTransfers";
export {stopId, toStopTimeRow, withStopPoints} from "./transform/Platforms";
export {stationId, stopPointId} from "./transform/Atco";
export {agencyId, toAgencyRow, toRouteRow} from "./transform/Noc";

// The build orchestrator
export {BuildFeed} from "./build/BuildFeed";
export {buildContext, dateRange, option, options, parseRange} from "./build/BuildContext";
export type {BuildContext, DateRange} from "./build/BuildContext";
export type {GTFSOutput} from "./build/GTFSOutput";
export {buildReport} from "./build/BuildReport";
export type {BuildReport, SourceReport} from "./build/BuildReport";
export {ScheduleBuilder} from "./build/ScheduleBuilder";
export type {ScheduleResults} from "./build/ScheduleBuilder";
export {parseConfig} from "./build/BuildConfig";
export type {BuildConfig, EnricherConfig, ExtensionConfig, Licence} from "./build/BuildConfig";

// Enrichment - what an external source is allowed to change, and the record of
// what it did
export {enrich, order, provenanceFile} from "./enrich/Enrich";
export {MutableFeed} from "./enrich/MutableFeed";
export {Provenance} from "./enrich/Provenance";
export type {Write, FieldHistory} from "./enrich/Provenance";
export type {Enricher, EnrichmentReport, Attribution} from "./enrich/Enricher";

// Extension - whole files the core build has no concept of
export {checkKeys, extend} from "./extend/Extend";
export {extensionFile} from "./extend/Extension";
export type {Extension, ExtensionFile, ExtensionOutput, ExtensionReport, KeyValue} from "./extend/Extension";
export type {FeedView} from "./extend/FeedView";

// The source SPI
export type {ScheduleStopTimeRow, StationCoordinates, TimetableSource} from "./source/TimetableSource";
export {toStop} from "./source/StationRecord";
export {isPlaceholder, withoutPlaceholders, reportDroppedStops} from "./source/Placeholder";
export {BOUNDS, inBounds} from "./source/Bounds";
export {locate, NOWHERE, toStopRow} from "./source/Located";
export type {StationRecord} from "./source/StationRecord";
export {toFixedLinks} from "./source/FixedLinkRecord";
export type {FixedLinkRecord} from "./source/FixedLinkRecord";

// Data that belongs in a source with a provenance rather than in the library
export {agencies} from "./data/agency";
export {stationCoordinates} from "./data/station-coordinates";
