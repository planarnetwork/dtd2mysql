import {GTFSFileStream} from "./GTFSFileStream";
import {TransXChange} from "../transxchange/TransXChange";

/**
 * Extract the agencies from the TransXChange objects
 */
export class AgencyStream extends GTFSFileStream<TransXChange> {
  private agenciesSeen: Record<string, boolean> = {};
  protected header = "agency_id,agency_name,agency_url,agency_timezone,agency_lang,agency_phone,agency_fare_url";
  private readonly agencyUrl = process.env.AGENCY_URL || "http://agency.com";
  private readonly agencyTimezone = process.env.AGENCY_TIMEZONE || "Europe/London";
  private readonly agencyLang = process.env.AGENCY_LANG || "en";

  protected transform(data: TransXChange): void {
    for (const operatorId of Object.keys(data.Operators)) {
      if (!this.agenciesSeen[operatorId]) {
        const operator = data.Operators[operatorId];
        const agencyName = operator.OperatorNameOnLicence || operator.OperatorShortName;

        this.pushLine(operatorId, agencyName, this.agencyUrl, this.agencyTimezone, this.agencyLang, "", "");

        this.agenciesSeen[operatorId] = true;
      }
    }
  }

}
