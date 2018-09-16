import {JourneyPatternSections, JourneyStop, Operators, TransXChange} from "./TransXChange";
import {Transform, TransformCallback} from "stream";

/**
 * Transforms JSON objects into a TransXChange objects
 */
export class TransXChangeStream extends Transform {

  constructor() {
    super({ objectMode: true });
  }

  /**
   * Extract the stops, journeys and operators and emit them as a TransXChange object
   */
  public _transform(data: any, encoding: string, callback: TransformCallback): void {
    const tx = data.TransXChange;

    callback(undefined, {
      StopPoints: tx.StopPoints[0].AnnotatedStopPointRef,
      JourneySections: tx.JourneyPatternSections[0].JourneyPatternSection.reduce(this.getJourneySections, {}),
      Operators: tx.Operators[0].Operator.reduce(this.getOperators, {})
    });
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
      OperatorNameOnLicence: operator.OperatorNameOnLicence[0],
    };

    return index;
  }

}
