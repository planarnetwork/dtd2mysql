
import {DatabaseConnection} from "../../database/DatabaseConnection";
import {Transfer} from "../Transfer";

/**
 * Provide access to the CIF data in a vaguely GTFS-ish shape.
 */
export class GTFSRepository {

  constructor(
    private readonly db: DatabaseConnection
  ) {}

  /**
   * Return the interchange time between each station
   */
  public async getInterchange(): Promise<Transfer[]> {
    const [results, fields] = await this.db.query<Transfer[]>(`
      SELECT 
        crs_code AS from_stop_id, 
        crs_code AS to_stop_id, 
        2 AS transfer_type, 
        minimum_change_time * 60 AS duration 
      FROM physical_station
    `);

    return results;
  }

  /**
   * Close the underlying database
   */
  public end(): Promise<any> {
    return this.db.end();
  }
}