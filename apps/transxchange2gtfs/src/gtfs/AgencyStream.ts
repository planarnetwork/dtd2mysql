import {GTFSFileStream} from "./GTFSFileStream";
import {TransXChange} from "../transxchange/TransXChange";

/**
 * Extract the agencies from the TransXChange objects
 */
export class AgencyStream extends GTFSFileStream<TransXChange> {
  private agenciesSeen: Record<string, boolean> = {};
  protected header = "agency_id,agency_name,agency_url,agency_timezone,agency_lang,agency_phone,agency_fare_url";

  protected transform(data: TransXChange): void {
    for (const operatorId of Object.keys(data.Operators)) {
      if (!this.agenciesSeen[operatorId]) {
        const operator = data.Operators[operatorId];

        this.pushLine(`${operatorId},${operator.OperatorShortName},http://agency.com,Europe/London,en,,`);

        this.agenciesSeen[operatorId] = true;
      }
    }
  }

}
