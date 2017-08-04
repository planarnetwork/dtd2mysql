import * as chai from "chai";
import {DatabaseConnection} from "../../src/database/DatabaseConnection";
import {MySQLSchema} from "../../src/database/MySQLSchema";
import {FixedWidthRecord} from "../../src/feed/record/FixedWidthRecord";
import {IntField, ZeroFillIntField} from "../../src/feed/field/IntField";
import {TextField, VariableLengthText} from "../../src/feed/field/TextField";
import {DateField} from "../../src/feed/field/DateField";
import {TimeField} from "../../src/feed/field/TimeField";
import {BooleanField} from "../../src/feed/field/BooleanField";
import {DoubleField} from "../../src/feed/field/DoubleField";

describe("MySQLSchema", () => {
  const record = new FixedWidthRecord(
    "test",
    ["field", "field4"], {
      "field": new IntField(0, 4),
      "field2": new ZeroFillIntField(1, 3),
      "field3": new TextField(2, 5),
      "field4": new VariableLengthText(3, 5),
      "field5": new DateField(7),
      "field6": new TimeField(7),
      "field7": new BooleanField(7),
      "field8": new DoubleField(7, 7, 5),
    },
    ["field5", "field6"]
  );

  it("truncates a table", () => {
    const db = new MockDatabaseConnection();
    const schema = new MySQLSchema(db, record);

    schema.dropSchema();

    chai.expect(db.queries[0]).is.equal("DROP TABLE IF EXISTS \`test\`");
  });

  it("creates a table", () => {
    const db = new MockDatabaseConnection();
    const schema = new MySQLSchema(db, record);

    schema.createSchema();

    chai.expect(db.queries[0]).is.equal(
      "CREATE TABLE IF NOT EXISTS `test` (id INT(11) unsigned auto_increment NOT NULL PRIMARY KEY,`field` SMALLINT(4) unsigned NOT NULL,`field2` SMALLINT(3) unsigned zerofill NOT NULL,`field3` CHAR(5) CHARACTER SET latin1 COLLATE latin1_general_cs NOT NULL,`field4` VARCHAR(5) CHARACTER SET latin1 COLLATE latin1_general_cs NOT NULL,`field5` DATE NOT NULL,`field6` TIME NOT NULL,`field7` TINYINT(1) unsigned NOT NULL,`field8` DOUBLE(7, 5) unsigned NOT NULL, UNIQUE test_key (field,field4), KEY field5 (field5), KEY field6 (field6)) Engine=InnoDB"
    );
  });

});

class MockDatabaseConnection implements DatabaseConnection {
  public readonly queries: string[] = [];

  query(sql: string, parameters?: any[]): Promise<any> {
    this.queries.push(sql);

    return Promise.resolve();
  }

  end(): Promise<void> {
    return Promise.resolve();
  }

}
