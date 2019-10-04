import * as chai from "chai";
import {DatabaseConnection} from "../../src/database/DatabaseConnection";
import {MySQLTable} from "../../src/database/MySQLTable";
import {RecordAction} from "../../src/feed/record/Record";

describe("MySQLTable", () => {

  it("inserts to a table", () => {
    const db = new MockDatabaseConnection();
    const table = new MySQLTable(db, "my_table", 1);
    const action = RecordAction.Insert;
    const values = { some: "value" };

    table.apply({ action, values, keysValues: {} });

    chai.expect(db.inserts[0]).is.equal("INSERT IGNORE INTO \`my_table\` VALUES ?");
  });

  it("buffers inserts", () => {
    const db = new MockDatabaseConnection();
    const table = new MySQLTable(db, "my_table", 2);
    const action = RecordAction.Insert;
    const values = { some: "value" };

    table.apply({ action, values, keysValues: {} });
    chai.expect(db.inserts.length).is.equal(0);

    table.apply({ action, values, keysValues: {} });
    chai.expect(db.inserts[0]).is.equal("INSERT IGNORE INTO \`my_table\` VALUES ?");
  });

  it("flushes all remaining inserts", () => {
    const db = new MockDatabaseConnection();
    const table = new MySQLTable(db, "my_table", 2);
    const action = RecordAction.Insert;
    const values = { some: "value" };

    table.apply({ action, values, keysValues: {} });
    table.close();

    chai.expect(db.inserts[0]).is.equal("INSERT IGNORE INTO \`my_table\` VALUES ?");
  });

  it("updates records", () => {
    const db = new MockDatabaseConnection();
    const table = new MySQLTable(db, "my_table", 1);
    const action = RecordAction.Update;
    const values = { some: "value" };

    table.apply({ action, values, keysValues: {} });

    chai.expect(db.inserts[0]).is.equal("REPLACE INTO \`my_table\` VALUES ?");
  });

  it("deletes records", () => {
    const db = new MockDatabaseConnection();
    const table = new MySQLTable(db, "my_table", 2);
    const action = RecordAction.Delete;
    const values = { some: "value", other: "value" };

    table.apply({ action, values, keysValues: values });

    const values2 = { diff: "col", other: "value" };

    table.apply({ action, values: values2, keysValues: values2 });

    chai.expect(db.inserts[0]).is.equal(
      "DELETE FROM \`my_table\` WHERE (`some` = ? AND `other` = ?) OR (`diff` = ? AND `other` = ?)"
    );
  });

});

class MockDatabaseConnection implements DatabaseConnection {
  public readonly inserts: string[] = [];

  query(sql: string, parameters?: any[]): Promise<any> {
    this.inserts.push(sql);

    return Promise.resolve();
  }

  end(): Promise<void> {
    return Promise.resolve();
  }

  async getConnection(): Promise<DatabaseConnection> {
    return this;
  }

  async release(): Promise<void> {

  }

}
