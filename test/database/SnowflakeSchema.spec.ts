import * as chai from "chai";
import { expect } from "chai";
import * as sinon from "sinon";
import sinonChai from "sinon-chai";
import { SnowflakeSchema } from "../../src/database/SnowflakeSchema";
import { DatabaseConnection } from "../../src/database/DatabaseConnection";
import { SingleRecordFile } from "../../src/feed/file/SingleRecordFile";
import { IntField } from "../../src/feed/field/IntField";
import { TextField } from "../../src/feed/field/TextField";
import { BooleanField } from "../../src/feed/field/BooleanField";
import { DateField } from "../../src/feed/field/DateField";
import { TimeField } from "../../src/feed/field/TimeField";
import { DoubleField } from "../../src/feed/field/DoubleField";
import { ForeignKeyField } from "../../src/feed/field/ForeignKeyField";
import { Record, RecordAction } from "../../src/feed/record/Record";
import { RecordWithManualIdentifier } from "../../src/feed/record/FixedWidthRecord";

chai.use(sinonChai);

describe("SnowflakeSchema", () => {
  let mockDb: sinon.SinonStubbedInstance<DatabaseConnection>;
  let schema: SnowflakeSchema;
  let record: Record;
  let parentRecord: RecordWithManualIdentifier;

  beforeEach(() => {
    mockDb = {
      query: sinon.stub().resolves([[], {}]),
    } as any;

    parentRecord = new RecordWithManualIdentifier(
      "parent_table",
      ["id"],
      {
        id: new IntField(0, 11)
      },
      [],
      {},
      0,
      true
    );

    const recordType: Record = {
      name: "test_table",
      key: ["id"],
      fields: {
        id: new IntField(0, 11),
        name: new TextField(11, 50),
        is_active: new BooleanField(61),
        created_at: new DateField(62),
        updated_at: new TimeField(70, 8, false),
        price: new DoubleField(78, 10, 2),
        parent_id: new ForeignKeyField(parentRecord, 88)
      },
      indexes: ["name"],
      orderedInserts: true,
      extractValues: (line: string) => ({
        action: RecordAction.Insert,
        values: {},
        keysValues: {}
      })
    };

    const file = new SingleRecordFile(recordType);
    record = recordType;
    schema = new SnowflakeSchema(mockDb, record);
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should create schema with correct SQL", async () => {
    await schema.createSchema();
    expect(mockDb.query).to.have.been.calledWithMatch(
      `CREATE TABLE IF NOT EXISTS "test_table" (id NUMBER AUTOINCREMENT PRIMARY KEY, "id" BIGINT NOT NULL, "name" CHAR(50) NOT NULL, "is_active" BOOLEAN NOT NULL, "created_at" DATE NOT NULL, "updated_at" TIME NOT NULL, "price" FLOAT NOT NULL, "parent_id" NUMBER NOT NULL, UNIQUE test_table_key (id), INDEX name (name))`
    );
  });

  it("should drop schema with correct SQL", async () => {
    await schema.dropSchema();
    expect(mockDb.query).to.have.been.calledWith(
      `DROP TABLE IF EXISTS "test_table"`
    );
  });

  it("should handle nullable fields correctly", () => {
    const recordType: Record = {
      name: "test_table",
      key: ["id"],
      fields: {
        id: new IntField(0, 11, true),
        name: new TextField(11, 50, true)
      },
      indexes: [],
      orderedInserts: true,
      extractValues: (line: string) => ({
        action: RecordAction.Insert,
        values: {},
        keysValues: {}
      })
    };

    const file = new SingleRecordFile(recordType);
    record = recordType;
    schema = new SnowflakeSchema(mockDb, record);
    schema.createSchema();

    expect(mockDb.query).to.have.been.calledWith(
      `CREATE TABLE IF NOT EXISTS "test_table" (id NUMBER AUTOINCREMENT PRIMARY KEY, "id" BIGINT NULL, "name" CHAR(50) NULL, UNIQUE test_table_key (id))`
    );
  });

  it("should handle different integer types based on length", () => {
    const recordType: Record = {
      name: "test_table",
      key: ["tiny"],
      fields: {
        tiny: new IntField(0, 2),
        small: new IntField(2, 4),
        medium: new IntField(6, 7),
        large: new IntField(13, 9),
        huge: new IntField(22, 11)
      },
      indexes: [],
      orderedInserts: true,
      extractValues: (line: string) => ({
        action: RecordAction.Insert,
        values: {},
        keysValues: {}
      })
    };

    const file = new SingleRecordFile(recordType);
    record = recordType;
    schema = new SnowflakeSchema(mockDb, record);
    schema.createSchema();

    expect(mockDb.query).to.have.been.calledWith(
      `CREATE TABLE IF NOT EXISTS "test_table" (id NUMBER AUTOINCREMENT PRIMARY KEY, "tiny" INTEGER NOT NULL, "small" INTEGER NOT NULL, "medium" INTEGER NOT NULL, "large" INTEGER NOT NULL, "huge" BIGINT NOT NULL, UNIQUE test_table_key (tiny))`
    );
  });
}); 