
import {CLICommand} from "./CLICommand";
import {DatabaseConnection} from "../database/DatabaseConnection";

export class CleanFaresCommand implements CLICommand {
  private readonly queries = [
    "DELETE FROM ticket_type WHERE end_date < CURDATE()",
    "DELETE FROM location WHERE end_date < CURDATE()",
    "DELETE FROM location_group_member WHERE end_date < CURDATE()",
    "DELETE FROM status_discount WHERE end_date < CURDATE()",
    "DELETE FROM status WHERE end_date < CURDATE()",
    "DELETE FROM route_location WHERE end_date < CURDATE()",
    "DELETE FROM route WHERE end_date < CURDATE()",
    "DELETE FROM non_standard_discount WHERE end_date < CURDATE()",
    "DELETE FROM railcard WHERE end_date < CURDATE()",
    "DELETE FROM location_railcard WHERE end_date < CURDATE()",
    "DELETE FROM railcard_minimum_fare WHERE end_date < CURDATE()",
    "DELETE FROM non_derivable_fare_override WHERE end_date < CURDATE()",
    "UPDATE non_derivable_fare_override SET adult_fare = null WHERE adult_fare = 99999 OR adult_fare >= 999999",
    "UPDATE non_derivable_fare_override SET child_fare = null WHERE child_fare = 99999 OR child_fare >= 999999",
    "UPDATE location SET lul_zone_1 = 1 WHERE nlc = '0027'",
    "UPDATE location SET lul_zone_2 = 1 WHERE nlc = '0028'",
    "UPDATE location SET lul_zone_3 = 1 WHERE nlc = '0029'",
    "UPDATE location SET lul_zone_4 = 1 WHERE nlc = '0030'",
    "UPDATE location SET lul_zone_5 = 1 WHERE nlc = '0031'",
    "UPDATE location SET lul_zone_6 = 1 WHERE nlc = '0071'",
    "UPDATE railcard SET min_adults=1, max_adults=1, min_children=0, max_children=0, max_passengers=1 WHERE railcard_code='YNG'",
    "UPDATE railcard SET min_adults=1, max_adults=1, min_children=0, max_children=0, max_passengers=1 WHERE railcard_code='TST'",
    "UPDATE railcard SET min_adults=1, max_adults=2, min_children=0, max_children=0, max_passengers=2 WHERE railcard_code='DIS'",
    "UPDATE railcard SET min_adults=1, max_adults=1, min_children=1, max_children=1, max_passengers=2 WHERE railcard_code='DIC'",
    "UPDATE railcard SET min_adults=1, max_adults=4, min_children=1, max_children=4, max_passengers=8 WHERE railcard_code='FAM'",
    "UPDATE railcard SET min_adults=1, max_adults=1, min_children=0, max_children=4, max_passengers=5 WHERE railcard_code='HMF'",
    "UPDATE railcard SET min_adults=1, max_adults=4, min_children=0, max_children=4, max_passengers=8 WHERE railcard_code='NGC'",
    "UPDATE railcard SET min_adults=1, max_adults=4, min_children=0, max_children=4, max_passengers=8 WHERE railcard_code='NEW'",
    "UPDATE railcard SET min_adults=1, max_adults=1, min_children=0, max_children=0, max_passengers=1 WHERE railcard_code='SRN'",
    "UPDATE railcard SET min_adults=2, max_adults=2, min_children=0, max_children=0, max_passengers=2 WHERE railcard_code='2TR'",
    "UPDATE railcard SET min_adults=3, max_adults=9, min_children=0, max_children=0, max_passengers=9 WHERE railcard_code='GS3'",
    "UPDATE railcard SET min_adults=1, max_adults=1, min_children=0, max_children=0, max_passengers=1 WHERE railcard_code='JCP'",
    "UPDATE railcard SET min_adults=0, max_adults=9, min_children=0, max_children=9, max_passengers=9 WHERE railcard_code=''",
    "UPDATE status_discount SET discount_indicator = 'X' WHERE status_code != '000' and status_code != '001' AND discount_percentage = 0",
  ];

  private readonly restrictionTables = [
    "restriction_time_date", "restriction_ticket_calendar", "restriction_train_date", "restriction_header_date"
  ];

  constructor(
    private readonly db: DatabaseConnection
  ) {}

  /**
   * Clean out expired data, update the schema to have start_date and end_date then populate those fields
   */
  public async run(argv: string[]): Promise<void> {
    try {
      await Promise.all([
        this.setNetworkAreaRestrictionCodes(),
        this.clean(),
        this.applyRestrictionDates()
      ]);
    }
    catch (err) {
      console.error(err);
    }

    await this.db.end();
  }

  private async clean(): Promise<void> {
    await Promise.all(this.queries.map(q => this.queryWithRetry(q)));

    console.log("Removed old and irrelevant fares data");
  }

  private async applyRestrictionDates(): Promise<void> {
    const [[current, future]] = await this.db.query<RestrictionDateRow>("SELECT * FROM restriction_date ORDER BY cf_mkr");

    await Promise.all(this.restrictionTables.map(
      t => this.updateRestrictionDatesOnTable(t, this.startOfYear(current.start_date), this.startOfYear(future.start_date))
    ));

    console.log("Applied restriction dates");
  }

  private async updateRestrictionDatesOnTable(tableName: string,
                                              current: Temporal.PlainDate,
                                              future: Temporal.PlainDate): Promise<any> {
    const [records] = await this.db.query<RestrictionRow>(`SELECT * FROM ${tableName}`);
    const promises = records.map(record => {
      const earliestDate = record.cf_mkr === 'C' ? current : future;
      const startDate = this.getFirstDateAfter(earliestDate, record.date_from);
      const endDate = startDate && this.getFirstDateAfter(startDate, record.date_to);

      if (!startDate || !endDate || Temporal.PlainDate.compare(startDate, endDate) > 0) {
        console.log(`Invalid dates on ${tableName}: ${record.date_from}, ${record.date_to} after ${earliestDate.toString()}`);
      }
      else {
        return this.db.query(`UPDATE ${tableName} SET start_date = ?, end_date = ? WHERE id = ?`, [
          startDate.toString(),
          endDate.toString(),
          record.id
        ]);
      }
    });

    return Promise.all(promises);
  }

  private async queryWithRetry(query: string, max: number = 10, current: number = 1): Promise<void> {
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

  private async setNetworkAreaRestrictionCodes(): Promise<void> {
    await this.queryWithRetry("DELETE FROM fare WHERE fare < 5 OR fare = 99999 OR fare >= 999999");
    await this.queryWithRetry("DROP TABLE IF EXISTS network_flow_restriction");
    await this.queryWithRetry(`
      CREATE TABLE network_flow_restriction (
        origin CHAR(4) NOT NULL,
        destination CHAR(4) NOT NULL,
        route_code CHAR(5) NOT NULL,
        direction CHAR(1) NOT NULL,
        restriction_code CHAR(2) NOT NULL
      )`);

    await this.queryWithRetry(`
      INSERT INTO network_flow_restriction
      SELECT origin_code, destination_code, route_code, direction, restriction_code
      FROM flow
      JOIN fare USING (flow_id)
      WHERE ticket_code IN ('CDR', 'CDS', 'ODT', 'SVR', 'SVS')
      AND restriction_code IS NOT NULL
      GROUP BY origin_code, destination_code, route_code
    `);

    console.log("Calculated network area restrictions");
  }

  /**
   * The 1st of January in the year of the given date
   */
  private startOfYear(date: string): Temporal.PlainDate {
    return Temporal.PlainDate.from(date).with({ month: 1, day: 1 });
  }

  /**
   * Given a short form restriction month MMDD this method will return the first instance of that date that occurs
   * after the given date. For example with a restriction date of 2017-06-01 the earliest date of 0301 is 2018-03-01.
   *
   * Returns undefined when the restriction month is not a real date in the resulting year - 0229 outside a leap
   * year, say. moment returned an invalid date for those and the caller tested isValid(); Temporal rejects them.
   */
  private getFirstDateAfter(earliestDate: Temporal.PlainDate, restrictionMonth: string): Temporal.PlainDate | undefined {
    const month = +restrictionMonth.slice(0, 2);
    const day = +restrictionMonth.slice(2);
    const yearOffset = (earliestDate.month > month || (earliestDate.month === month && earliestDate.day > day)) ? 1 : 0;

    try {
      return Temporal.PlainDate.from({ year: earliestDate.year + yearOffset, month, day }, { overflow: "reject" });
    }
    catch {
      return undefined;
    }
  }

}

interface RestrictionRow {
  cf_mkr: "C" | "F";
  date_from: string;
  date_to: string;
  id: number;
}

interface RestrictionDateRow {
  start_date: string;
  end_date: string;
}
