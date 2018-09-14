import autobind from "autobind-decorator";
import {JourneyPatternSections, JourneyStop, Operators, TransXChange} from "./TransXChange";

@autobind
export class TransXChangeFactory {

  /**
   * Extract the stops
   */
  public getTransXChange(data: any): TransXChange {
    const tx = data.TransXChange;

    return {
      StopPoints: tx.StopPoints[0].AnnotatedStopPointRef,
      JourneySections: tx.JourneyPatternSections[0].JourneyPatternSection.reduce(this.getJourneySections, {}),
      Operators: tx.Operators[0].Operator.reduce(this.getOperators, {})
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
      OperatorNameOnLicence: operator.OperatorNameOnLicence[0],
    };

    return index;
  }

}

/**
 * Function that converts the JSON output from the XML parser into a TransXChange object
 */
export type ParseTransXChange = (data: Object) => TransXChange;
