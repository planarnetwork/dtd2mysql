import {describe, it, expect} from "vitest";
import {DatabaseConnection} from "../database/DatabaseConnection";
import {MySqlTimetableSource} from "./MySqlTimetableSource";
import {Pool} from "mysql2";
import {DateRange} from "@gb-rail/gtfs";

const range: DateRange = {
  from: Temporal.PlainDate.from("2026-01-01"),
  to: Temporal.PlainDate.from("2026-01-08")
};

describe("MySqlTimetableSource", () => {

  it("says the schedule table is empty rather than failing on the row it did not get", async () => {
    const source = new MySqlTimetableSource(new EmptyDatabase(), {} as Pool, {});

    await expect(source.getSchedules(range)).rejects.toThrow(/schedule table is empty/);
  });

  it("names the import step, because that is what the operator has to do next", async () => {
    const source = new MySqlTimetableSource(new EmptyDatabase(), {} as Pool, {});

    await expect(source.getSchedules(range)).rejects.toThrow(/--timetable/);
  });

});

/**
 * A database where every table exists and every one of them is empty, which is
 * what a schema created but never imported into looks like.
 */
class EmptyDatabase implements DatabaseConnection {
  public query<RowType = unknown>(): Promise<[RowType[], any]> {
    return Promise.resolve([[], null]);
  }

  public getConnection(): Promise<DatabaseConnection> {
    return Promise.resolve(this);
  }

  public end(): Promise<void> {
    return Promise.resolve();
  }

  public release(): Promise<void> {
    return Promise.resolve();
  }
}
