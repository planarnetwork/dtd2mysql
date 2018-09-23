import {
  DateRange,
  DaysOfWeek,
  JourneyPatternSections,
  JourneyStop,
  Lines,
  Operators,
  StopPoint,
  TransXChange,
  VehicleJourney,
  Services, JourneyPatternID, JourneyPatternSectionID
} from "./TransXChange";
import {Transform, TransformCallback} from "stream";
import autobind from "autobind-decorator";
import {Duration, LocalDate, LocalTime} from "js-joda";

/**
 * Transforms JSON objects into a TransXChange objects
 */
@autobind
export class TransXChangeStream extends Transform {

  constructor() {
    super({ objectMode: true });
  }

  /**
   * Extract the stops, journeys and operators and emit them as a TransXChange object
   */
  public _transform(data: any, encoding: string, callback: TransformCallback): void {
    const tx = data.TransXChange;
    const patternIndex = tx.VehicleJourneys[0].VehicleJourney.reduce(this.getJourneyPatternIndex, {});

    const result: TransXChange = {
      StopPoints: tx.StopPoints[0].AnnotatedStopPointRef.map(this.getStop),
      JourneySections: tx.JourneyPatternSections[0].JourneyPatternSection.reduce(this.getJourneySections, {}),
      Operators: tx.Operators[0].Operator.reduce(this.getOperators, {}),
      Services: tx.Services[0].Service.reduce(this.getService, {}),
      VehicleJourneys: tx.VehicleJourneys[0].VehicleJourney.map((v: any) => this.getVehicleJourney(v, patternIndex))
    };

    callback(undefined, result);
  }

  private getStop(stop: any): StopPoint {
    return {
      StopPointRef: stop.StopPointRef[0],
      CommonName: stop.CommonName[0],
      LocalityName: stop.LocalityName[0],
      LocalityQualifier: stop.LocalityQualifier[0]
    };
  }

  private getJourneySections(index: JourneyPatternSections, section: any): JourneyPatternSections {
    index[section.$.id] = section.JourneyPatternTimingLink.map((l: any) => ({
      From: this.getJourneyStop(l.From[0]),
      To: this.getJourneyStop(l.To[0]),
      RunTime: Duration.parse(l.RunTime[0])
    }));

    return index;
  }

  private getJourneyStop(stop: any): JourneyStop {
    return {
      Activity: stop.Activity[0],
      StopPointRef: stop.StopPointRef[0],
      WaitTime: stop.WaitTime && Duration.parse(stop.WaitTime[0])
    };
  }

  private getOperators(index: Operators, operator: any): Operators {
    index[operator.$.id] = {
      OperatorCode: operator.OperatorCode[0],
      OperatorShortName: operator.OperatorShortName[0],
      OperatorNameOnLicence: operator.OperatorNameOnLicence && operator.OperatorNameOnLicence[0],
    };

    return index;
  }

  private getService(index: Services, service: any): Services {
    index[service.ServiceCode[0]] = {
      ServiceCode: service.ServiceCode[0],
      Lines: service.Lines[0].Line.reduce(this.getLines, {}),
      OperatingPeriod: this.getDateRange(service.OperatingPeriod[0]),
      RegisteredOperatorRef: service.RegisteredOperatorRef[0],
      Description: service.Description[0],
      Mode: service.Mode[0],
      StandardService: service.StandardService[0].JourneyPattern.reduce(this.getJourneyPattern, {})
    };

    return index;
  }

  private getJourneyPattern(patterns: Record<JourneyPatternID, JourneyPatternSectionID[]>, pattern: any) {
    patterns[pattern.$.id] = pattern.JourneyPatternSectionRefs;

    return patterns;
  }

  private getLines(index: Lines, line: any): Lines {
    index[line.$.id] = line.LineName[0];

    return index;
  }

  private getDateRange(dates: any): DateRange {
    return {
      StartDate: LocalDate.parse(dates.StartDate[0]),
      EndDate: dates.EndDate[0] ? LocalDate.parse(dates.EndDate[0]) : LocalDate.parse("2099-12-31"),
    };
  }

  private getVehicleJourney(vehicle: any, index: JourneyPatternIndex): VehicleJourney {
    return {
      LineRef: vehicle.LineRef[0],
      ServiceRef: vehicle.ServiceRef[0],
      VehicleJourneyCode: vehicle.VehicleJourneyCode[0],
      JourneyPatternRef: vehicle.JourneyPatternRef ? vehicle.JourneyPatternRef[0] : index[vehicle.VehicleJourneyRef[0]],
      DepartureTime: LocalTime.parse(vehicle.DepartureTime[0]),
      OperatingProfile: {
        RegularDayType: vehicle.OperatingProfile[0].RegularDayType[0].DaysOfWeek
          ? vehicle.OperatingProfile[0].RegularDayType[0].DaysOfWeek.map(this.getDaysOfWeek)
          : "HolidaysOnly",
        BankHolidayOperation: {
          DaysOfOperation: vehicle.BankHolidayOperation ? vehicle.BankHolidayOperation[0].map((bh: any) => bh[0]) : [],
          DaysOfNonOperation: vehicle.BankHolidayOperation ? vehicle.BankHolidayOperation[0].map((bh: any) => bh[0]) : []
        },
        SpecialDaysOperation: {
          DaysOfOperation: vehicle.SpecialDaysOperation ? vehicle.SpecialDaysOperation[0].map(this.getDateRange) : [],
          DaysOfNonOperation: vehicle.SpecialDaysOperation ? vehicle.SpecialDaysOperation[0].map(this.getDateRange) : []
        }
      }
    };
  }

  private getDaysOfWeek(days: any): DaysOfWeek {
    return daysOfWeekIndex[Object.keys(days)[0]];
  }

  private getJourneyPatternIndex(index: JourneyPatternIndex, vehicle: any): JourneyPatternIndex {
    if (vehicle.JourneyPatternRef) {
      index[vehicle.VehicleJourneyCode[0]] = vehicle.JourneyPatternRef[0];
    }

    return index;
  }
}

/**
 * TransXChange's comical idea of how to represent days of operation
 */
export const daysOfWeekIndex: Record<string, DaysOfWeek> = {
  "MondayToFriday": [1, 1, 1, 1, 1, 0, 0],
  "MondayToSaturday": [1, 1, 1, 1, 1, 1, 0],
  "MondayToSunday": [1, 1, 1, 1, 1, 1, 1],
  "NotSaturday": [1, 1, 1, 1, 1, 0, 1],
  "Monday": [1, 0, 0, 0, 0, 0, 0],
  "Tuesday": [0, 1, 0, 0, 0, 0, 0],
  "Wednesday": [0, 0, 1, 0, 0, 0, 0],
  "Thursday": [0, 0, 0, 1, 0, 0, 0],
  "Friday": [0, 0, 0, 0, 1, 0, 0],
  "Saturday": [0, 0, 0, 0, 0, 1, 0],
  "Sunday": [0, 0, 0, 0, 0, 0, 1],
};

/**
 * VehicleJourneyCode to JourneyPatternRef
 */
export type JourneyPatternIndex = Record<string, string>;
