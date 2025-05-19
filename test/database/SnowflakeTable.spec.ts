import * as chai from "chai";
import { expect } from "chai";
import * as sinon from "sinon";
import sinonChai from "sinon-chai";
import { SnowflakeTable } from "../../src/database/SnowflakeTable";
import { DatabaseConnection } from "../../src/database/DatabaseConnection";
import { ParsedRecord, RecordAction } from "../../src/feed/record/Record";

chai.use(sinonChai);

describe("SnowflakeTable", () => {
  let mockDb: sinon.SinonStubbedInstance<DatabaseConnection>;
  let table: SnowflakeTable;
  const tableName = "test_table";

  beforeEach(() => {
    mockDb = {
      query: sinon.stub().resolves([[], {}]),
      release: sinon.stub().resolves(),
    } as any;

    table = new SnowflakeTable(mockDb, tableName, 2); // Small flush limit for testing
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should buffer inserts until flush limit is reached", async () => {
    const records = [
      { action: RecordAction.Insert, values: { id: 1, name: "test1" }, keysValues: { id: 1 } },
      { action: RecordAction.Insert, values: { id: 2, name: "test2" }, keysValues: { id: 2 } },
    ];

    for (const record of records) {
      await table.apply(record as ParsedRecord);
    }

    expect(mockDb.query).to.have.been.calledWith(
      `MERGE INTO "test_table" target
       USING (SELECT * FROM TABLE(FLATTEN(input => parse_json(?)))) source
       ON target."id" = source."id"
       WHEN NOT MATCHED THEN INSERT ("id", "name") VALUES ("id", "name")`,
      [JSON.stringify(records.map(r => Object.values(r.values)))]
    );
  });

  it("should handle updates correctly", async () => {
    const record = {
      action: RecordAction.Update,
      values: { id: 1, name: "updated" },
      keysValues: { id: 1 }
    };

    await table.apply(record as ParsedRecord);
    await table.close();

    expect(mockDb.query).to.have.been.calledWith(
      `MERGE INTO "test_table" target
       USING (SELECT * FROM TABLE(FLATTEN(input => parse_json(?)))) source
       ON target."id" = source."id"
       WHEN MATCHED THEN UPDATE SET "id" = source."id", "name" = source."name"`,
      [JSON.stringify([Object.values(record.values)])]
    );
  });

  it("should handle deletes correctly", async () => {
    const record = {
      action: RecordAction.Delete,
      values: { id: 1 },
      keysValues: { id: 1 }
    };

    await table.apply(record as ParsedRecord);
    await table.close();

    expect(mockDb.query).to.have.been.calledWith(
      `DELETE FROM "test_table" WHERE ("id" = ?)`,
      [1]
    );
  });

  it("should handle delayed inserts correctly", async () => {
    const record = {
      action: RecordAction.DelayedInsert,
      values: { id: 1, name: "test" },
      keysValues: { id: 1 }
    };

    await table.apply(record as ParsedRecord);
    await table.close();

    expect(mockDb.query).to.have.been.calledWith(
      `DELETE FROM "test_table" WHERE ("id" = ?)`,
      [1]
    );

    expect(mockDb.query).to.have.been.calledWith(
      `MERGE INTO "test_table" target
       USING (SELECT * FROM TABLE(FLATTEN(input => parse_json(?)))) source
       ON target."id" = source."id"
       WHEN NOT MATCHED THEN INSERT ("id", "name") VALUES ("id", "name")`,
      [JSON.stringify([Object.values(record.values)])]
    );
  });

  it("should retry on lock timeout errors", async () => {
    const record = {
      action: RecordAction.Insert,
      values: { id: 1, name: "test" },
      keysValues: { id: 1 }
    };

    mockDb.query
      .onFirstCall().rejects({ code: '390189' })
      .onSecondCall().resolves([[], {}]);

    await table.apply(record as ParsedRecord);
    await table.close();

    expect(mockDb.query).to.have.been.calledTwice;
  });
}); 