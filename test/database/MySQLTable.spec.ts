import * as chai from "chai";
import {DatabaseConnection} from "../../src/database/DatabaseConnection";
import {MySQLTable} from "../../src/database/MySQLTable";

describe("MySQLTable", () => {

  it("inserts to a table", () => {
    const db = new MockDatabaseConnection();
    const table = new MySQLTable(db, "my_table", 1);

    table.insert(["some", "values"]);

    chai.expect(db.inserts[0]).is.equal("INSERT INTO \`my_table\` VALUES ?");
  });

  it("buffers inserts", () => {
    const db = new MockDatabaseConnection();
    const table = new MySQLTable(db, "my_table", 2);

    table.insert(["some", "values"]);
    chai.expect(db.inserts.length).is.equal(0);

    table.insert(["some", "values"]);
    chai.expect(db.inserts[0]).is.equal("INSERT INTO \`my_table\` VALUES ?");
  });

  it("flushes all remaining inserts", () => {
    const db = new MockDatabaseConnection();
    const table = new MySQLTable(db, "my_table", 2);

    table.insert(["some", "values"]);

    table.close();
    chai.expect(db.inserts[0]).is.equal("INSERT INTO \`my_table\` VALUES ?");
  });

});

class MockDatabaseConnection implements DatabaseConnection {
  public readonly inserts: string[] = [];

  query(sql: string, parameters?: any[]): Promise<void> {
    this.inserts.push(sql);

    return Promise.resolve();
  }

  end(): Promise<void> {
    return Promise.resolve();
  }

}
