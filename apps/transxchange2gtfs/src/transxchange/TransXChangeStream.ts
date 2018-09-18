import {
  JourneyPatternSections,
  JourneyStop,
  Lines,
  Operators, Service,
  StopPoint,
  TransXChange
} from "./TransXChange";
import {Transform, TransformCallback} from "stream";
import autobind from "autobind-decorator";
import {LocalDate} from "js-joda";

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
    const result: TransXChange = {
      StopPoints: tx.StopPoints[0].AnnotatedStopPointRef.map(this.getStop),
      JourneySections: tx.JourneyPatternSections[0].JourneyPatternSection.reduce(this.getJourneySections, {}),
      Operators: tx.Operators[0].Operator.reduce(this.getOperators, {}),
      Services: tx.Services[0].Service.map(this.getService)
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
      RunTime: l.RunTime[0]
    }));

    return index;
  }

  private getJourneyStop(stop: any): JourneyStop {
    return {
      Activity: stop.Activity[0],
      StopPointRef: stop.StopPointRef[0],
      WaitTime: stop.WaitTime && stop.WaitTime[0]
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

  private getService(service: any): Service {
    return {
      ServiceCode: service.ServiceCode[0],
      Lines: service.Lines[0].Line.reduce(this.getLines, {}),
      OperatingPeriod: {
        StartDate: LocalDate.parse(service.OperatingPeriod[0].StartDate[0]),
        EndDate: service.OperatingPeriod[0].EndDate[0]
          ? LocalDate.parse(service.OperatingPeriod[0].EndDate[0])
          : LocalDate.parse("2099-12-31"),
      },
      RegisteredOperatorRef: service.RegisteredOperatorRef[0],
      Description: service.Description[0],
      Mode: service.Mode[0]
    };
  }

  private getLines(index: Lines, line: any): Lines {
    index[line.$.id] = line.LineName[0];

    return index;
  }
}
