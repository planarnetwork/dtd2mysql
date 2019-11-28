import {
  DateRange,
  DaysOfWeek,
  JourneyPatterns,
  JourneyPatternSections,
  JourneyStop,
  Lines,
  Mode,
  OperatingProfile,
  Operators,
  Services,
  StopActivity,
  StopPoint, TimingLink,
  TransXChange,
  VehicleJourney
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
    const services = tx.Services[0].Service.reduce(this.getServices, {});

    const result: TransXChange = {
      StopPoints: tx.StopPoints[0].AnnotatedStopPointRef.map(this.getStop),
      JourneySections: tx.JourneyPatternSections[0].JourneyPatternSection.reduce(this.getJourneySections, {}),
      Operators: tx.Operators[0].Operator.reduce(this.getOperators, {}),
      Services: services,
      VehicleJourneys: tx.VehicleJourneys[0].VehicleJourney
        .map((v: any) => this.getVehicleJourney(v, patternIndex, services))
    };

    callback(undefined, result);
  }

  private getStop(stop: any): StopPoint {
    return {
      StopPointRef: stop.StopPointRef[0],
      CommonName: stop.CommonName[0],
      LocalityName: stop.LocalityName ? stop.LocalityName[0] : "",
      LocalityQualifier: stop.LocalityQualifier ? stop.LocalityQualifier[0] : "",
      Location:  {
        Latitude: stop.Location && stop.Location[0].Latitude ? Number(stop.Location[0].Latitude[0]) : 0.0,
        Longitude: stop.Location && stop.Location[0].Longitude ? Number(stop.Location[0].Longitude[0]) : 0.0
      }
    };
  }

  private getJourneySections(index: JourneyPatternSections, section: any): JourneyPatternSections {
    index[section.$.id] = section.JourneyPatternTimingLink ? section.JourneyPatternTimingLink.map(this.getLink) : [];

    return index;
  }

  private getLink(l: any): TimingLink {
    return {
      From: this.getJourneyStop(l.From[0]),
      To: this.getJourneyStop(l.To[0]),
      RunTime: Duration.parse(l.RunTime[0])
    };
  }

  private getJourneyStop(stop: any): JourneyStop {
    return {
      Activity: stop.Activity ? stop.Activity[0] : StopActivity.PickUpAndSetDown,
      StopPointRef: stop.StopPointRef[0],
      TimingStatus: stop.TimingStatus[0],
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

  private getServices(index: Services, service: any): Services {
    index[service.ServiceCode[0]] = {
      ServiceCode: service.ServiceCode[0],
      Lines: service.Lines[0].Line.reduce(this.getLines, {}),
      OperatingPeriod: this.getDateRange(service.OperatingPeriod[0]),
      RegisteredOperatorRef: service.RegisteredOperatorRef[0],
      Description: service.Description ? service.Description[0].replace(/[\r\n\t]/g, "") : "",
      Mode: service.Mode ? service.Mode[0] : Mode.Bus,
      StandardService: service.StandardService[0].JourneyPattern.reduce(this.getJourneyPattern, {}),
      ServiceOrigin: service.StandardService[0].Origin[0],
      ServiceDestination: service.StandardService[0].Destination[0],
      OperatingProfile: service.OperatingProfile
        ? this.getOperatingProfile(service.OperatingProfile[0])
        : undefined
    };

    return index;
  }

  private getJourneyPattern(patterns: JourneyPatterns, pattern: any): JourneyPatterns {
    patterns[pattern.$.id] = {
      Direction: pattern.Direction[0],
      Sections: pattern.JourneyPatternSectionRefs
    };

    return patterns;
  }

  private getLines(index: Lines, line: any): Lines {
    index[line.$.id] = line.LineName[0];

    return index;
  }

  private getDateRange(dates: any): DateRange {
    return {
      StartDate: LocalDate.parse(dates.StartDate[0]),
      EndDate: dates.EndDate && dates.EndDate[0] ? LocalDate.parse(dates.EndDate[0]) : LocalDate.parse("2099-12-31"),
    };
  }

  private getVehicleJourney(vehicle: any, index: JourneyPatternIndex, services: Services): VehicleJourney {
    return {
      LineRef: vehicle.LineRef[0],
      ServiceRef: vehicle.ServiceRef[0],
      VehicleJourneyCode: vehicle.VehicleJourneyCode[0],
      JourneyPatternRef: vehicle.JourneyPatternRef ? vehicle.JourneyPatternRef[0] : index[vehicle.VehicleJourneyRef[0]],
      DepartureTime: LocalTime.parse(vehicle.DepartureTime[0]),
      OperatingProfile: vehicle.OperatingProfile
        ? this.getOperatingProfile(vehicle.OperatingProfile[0])
        : services[vehicle.ServiceRef[0]].OperatingProfile!
    };
  }

  private getOperatingProfile(profile: any): OperatingProfile {
    const result = {
      BankHolidayOperation: {
        DaysOfOperation: [],
        DaysOfNonOperation: []
      },
      SpecialDaysOperation: {
        DaysOfOperation: [],
        DaysOfNonOperation: []
      },
      RegularDayType: profile.RegularDayType[0].DaysOfWeek
        ? this.getDaysOfWeek(profile.RegularDayType[0].DaysOfWeek[0])
        : "HolidaysOnly" as "HolidaysOnly"
    };

    if (profile.BankHolidayOperation && profile.BankHolidayOperation[0].DaysOfOperation && profile.BankHolidayOperation[0].DaysOfOperation[0]) {
      result.BankHolidayOperation.DaysOfOperation = profile.BankHolidayOperation[0].DaysOfOperation.map((bh: any) => Object.keys(bh)[0]);
    }
    if (profile.BankHolidayOperation && profile.BankHolidayOperation[0].DaysOfNonOperation && profile.BankHolidayOperation[0].DaysOfNonOperation[0]) {
      result.BankHolidayOperation.DaysOfNonOperation = profile.BankHolidayOperation[0].DaysOfNonOperation.map((bh: any) => Object.keys(bh)[0]);
    }
    if (profile.SpecialDaysOperation && profile.SpecialDaysOperation[0].DaysOfOperation && profile.SpecialDaysOperation[0].DaysOfOperation[0]) {
      result.SpecialDaysOperation.DaysOfOperation = profile.SpecialDaysOperation[0].DaysOfOperation[0].DateRange.map(this.getDateRange);
    }
    if (profile.SpecialDaysOperation && profile.SpecialDaysOperation[0].DaysOfNonOperation && profile.SpecialDaysOperation[0].DaysOfNonOperation[0]) {
      result.SpecialDaysOperation.DaysOfNonOperation = profile.SpecialDaysOperation[0].DaysOfNonOperation[0].DateRange.map(this.getDateRange);
    }

    return result;
  }

  private getDaysOfWeek(days: any): DaysOfWeek[] {
    return Object.keys(days).length === 0
      ? [[0, 0, 0, 0, 0, 0, 0]]
      : Object.keys(days).map(d => daysOfWeekIndex[d] || [0, 0, 0, 0, 0, 0, 0]);
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
  "Weekend": [0, 0, 0, 0, 0, 1, 1],
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
