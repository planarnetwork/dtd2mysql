
import {CLICommand} from "./CLICommand";
import {DatabaseConnection} from "../database/DatabaseConnection";
import moment = require("moment");
import {Moment} from "moment";

export class CleanFaresCommand implements CLICommand {
  private readonly tableUpdates: string[];
  private readonly queries: string[];

  constructor(
    private readonly db: DatabaseConnection,
    private readonly ticketCodeBlacklist: string,
    private readonly railcardWhiteList: string,
    private readonly restrictionTables: string[]
  ) {
    this.tableUpdates = restrictionTables.map(t => `ALTER TABLE ${t} ADD COLUMN start_date DATE, ADD COLUMN end_date DATE`);
    this.queries = [
      `DELETE FROM fare WHERE fare < 50 OR ticket_code IN (${ticketCodeBlacklist})`,
      `DELETE FROM ticket_type WHERE ticket_code IN (${ticketCodeBlacklist})`,
      "DELETE FROM flow WHERE usage_code = 'G'",
      "DELETE FROM flow WHERE flow_id NOT IN (SELECT flow_id FROM fare)",
      "DELETE FROM location WHERE end_date < CURDATE()",
      "DELETE FROM status_discount WHERE end_date < CURDATE()",
      "DELETE FROM status WHERE end_date < CURDATE()",
      "DELETE FROM route_location WHERE end_date < CURDATE()",
      "DELETE FROM route WHERE end_date < CURDATE()",
      `DELETE FROM non_derivable_fare_override WHERE end_date < CURDATE()`,
      `DELETE FROM non_derivable_fare_override WHERE ticket_code IN (${ticketCodeBlacklist})`,
      `DELETE FROM non_derivable_fare_override WHERE end_date < CURDATE() OR composite_indicator != 'Y' OR adult_fare < 50 OR child_fare < 50`,
      "UPDATE non_derivable_fare_override SET adult_fare = null WHERE adult_fare = 99999 OR adult_fare > 999999",
      "UPDATE non_derivable_fare_override SET child_fare = null WHERE child_fare = 99999 OR child_fare > 999999",
      `DELETE FROM non_standard_discount WHERE end_date < CURDATE()  OR ticket_code IN (${ticketCodeBlacklist})`,
      `DELETE FROM railcard WHERE end_date < CURDATE() OR railcard_code NOT IN (${railcardWhiteList})`,
      `DELETE FROM location_railcard WHERE end_date < CURDATE() OR railcard_code NOT IN (${railcardWhiteList})`,
      `DELETE FROM railcard_minimum_fare WHERE end_date < CURDATE() OR railcard_code NOT IN (${railcardWhiteList}) OR ticket_code IN (${ticketCodeBlacklist})`,
      "UPDATE railcard SET min_adults=1, max_adults=1, min_children=0, max_children=0, max_passengers=1 WHERE railcard_code='YNG'",
      "UPDATE railcard SET min_adults=1, max_adults=2, min_children=0, max_children=0, max_passengers=2 WHERE railcard_code='DIS'",
      "UPDATE railcard SET min_adults=1, max_adults=1, min_children=1, max_children=1, max_passengers=2 WHERE railcard_code='DIC'",
      "UPDATE railcard SET min_adults=1, max_adults=4, min_children=0, max_children=4, max_passengers=8 WHERE railcard_code='FAM'",
      "UPDATE railcard SET min_adults=1, max_adults=1, min_children=0, max_children=0, max_passengers=1 WHERE railcard_code='HMF'",
      "UPDATE railcard SET min_adults=1, max_adults=4, min_children=0, max_children=4, max_passengers=8 WHERE railcard_code='NGC'",
      "UPDATE railcard SET min_adults=1, max_adults=4, min_children=0, max_children=4, max_passengers=8 WHERE railcard_code='NEW'",
      "UPDATE railcard SET min_adults=1, max_adults=1, min_children=0, max_children=0, max_passengers=1 WHERE railcard_code='SRN'",
      "UPDATE railcard SET min_adults=2, max_adults=2, min_children=0, max_children=0, max_passengers=2 WHERE railcard_code='2TR'",
      "UPDATE railcard SET min_adults=3, max_adults=9, min_children=0, max_children=0, max_passengers=9 WHERE railcard_code='GS3'",
      "UPDATE railcard SET min_adults=1, max_adults=1, min_children=0, max_children=0, max_passengers=1 WHERE railcard_code='JCP'",
      "UPDATE railcard SET min_adults=0, max_adults=9, min_children=0, max_children=9, max_passengers=9 WHERE railcard_code=''",
      "UPDATE railcard SET child_status = null WHERE child_status='XXX' OR (child_status='001' AND railcard_code != '   ')",
      "UPDATE status_discount SET discount_indicator = 'X' WHERE status_code != '000' and status_code != '001' AND discount_percentage = 0",
    ];
  }

  /**
   * Clean out expired data, update the schema to have start_date and end_date then populate those fields
   */
  public async run(argv: string[]): Promise<void> {
    try {
      console.log("Removing old and irrelevant fares data");
      await Promise.all([
        ... this.queries.map(q => this.queryWithRetry(q)),
        ... this.tableUpdates.map(q => this.queryWithSilentFailure(q))
      ]);

      console.log("Applying restriction dates");
      const [[current, future]] = await this.db.query<RestrictionDateRow[]>("SELECT * FROM restriction_date ORDER BY cf_mkr");

      current.start_date = new Date(current.start_date.getFullYear(), 0, 1);
      future.start_date = new Date(future.start_date.getFullYear(), 0, 1);

      await Promise.all(
        this.restrictionTables.map(tableName => this.updateRestrictionDatesOnTable(tableName, current, future))
      );
    }
    catch (err) {
      console.error(err);
    }

    return this.db.end();
  }

  private async updateRestrictionDatesOnTable(tableName: string, current: RestrictionDateRow, future: RestrictionDateRow): Promise<any> {
    const [records] = await this.db.query<RestrictionRow[]>(`SELECT * FROM ${tableName}`);
    const promises = records.map(record => {
      const date = record.cf_mkr === 'C' ? current : future;
      const startDate = this.getFirstDateAfter(date.start_date, record.date_from);
      const endDate = this.getFirstDateAfter(startDate.toDate(), record.date_to);

      if (startDate.isAfter(endDate)) {
        throw new Error(`Error processing ${record} start date after end date: ${startDate.format("YYYY-MM-DD")} ${endDate.format("YYYY-MM-DD")}`);
      }
      else {
        return this.db.query(`UPDATE ${tableName} SET start_date = ?, end_date = ? WHERE id = ?`, [
          startDate.format("YYYY-MM-DD"),
          endDate.format('YYYY-MM-DD'),
          record.id
        ]);
      }
    });

    return Promise.all(promises);
  }

  /**
   * Given a short form restriction month MMDD this method will return the first instance of that date that occurs
   * after the given date. For example with a restriction date of 2017-06-01 the earliest date of 0301 is 2018-03-01
   */
  private getFirstDateAfter(earliestDate: Date, restrictionMonth: string): Moment {
    const earliestMonth = moment(earliestDate).format("MMDD");
    const yearOffset = (parseInt(earliestMonth) > parseInt(restrictionMonth)) ? 1 : 0;

    return moment((earliestDate.getFullYear() + yearOffset) + restrictionMonth, "YYYYMMDD");
  }

  private async queryWithRetry(query: string, max: number = 3, current: number = 1): Promise<void> {
    try {
      await this.db.query(query)
    }
    catch (err) {
      if (current >= max) {
        throw err;
      }
      else {
        await this.queryWithRetry(query, max, current + 1);
      }
    }
  }

  private async queryWithSilentFailure(query: string): Promise<void> {
    try {
      await this.db.query(query)
    }
    catch (err) { }
  }
}

interface RestrictionRow {
  cf_mkr: "C" | "F";
  date_from: string;
  date_to: string;
  id: number;
}

interface RestrictionDateRow {
  start_date: Date;
  end_date: Date;
}