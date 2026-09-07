import {AgencyRow} from "@gb-transit/gtfs-schema";
import {RowStream} from "./RowStream";
import {AGENCY} from "./TxcFeed";
import {TransXChange} from "../transxchange/TransXChange";

/**
 * Extract the agencies from the TransXChange objects
 */
export class AgencyStream extends RowStream<TransXChange, AgencyRow> {
  public readonly file = AGENCY;

  private agenciesSeen: Record<string, boolean> = {};
  private readonly agencyUrl = process.env.AGENCY_URL || "http://agency.com";
  private readonly agencyTimezone = process.env.AGENCY_TIMEZONE || "Europe/London";
  private readonly agencyLang = process.env.AGENCY_LANG || "en";

  protected transform(data: TransXChange): void {
    for (const operatorId of Object.keys(data.Operators)) {
      if (!this.agenciesSeen[operatorId]) {
        const operator = data.Operators[operatorId];
        const agencyName = operator.TradingName || operator.OperatorNameOnLicence || operator.OperatorShortName;

        this.pushRow({
          agency_id: operatorId,
          agency_name: agencyName,
          agency_url: this.agencyUrl,
          agency_timezone: this.agencyTimezone,
          agency_lang: this.agencyLang,
          agency_phone: "",
          agency_fare_url: ""
        });

        this.agenciesSeen[operatorId] = true;
      }
    }
  }

}
