import * as chai from "chai";
import { expect } from "chai";
import * as sinon from "sinon";
import sinonChai from "sinon-chai";
import { SnowflakeConnection } from "../../src/database/SnowflakeConnection";
import { DatabaseConfiguration } from "../../src/database/DatabaseConnection";
import * as snowflake from "snowflake-sdk";
import { Readable } from "stream";

chai.use(sinonChai);

describe("SnowflakeConnection", () => {
  let config: DatabaseConfiguration;
  let connection: SnowflakeConnection;
  let mockPool: sinon.SinonStubbedInstance<snowflake.Pool<any>>;
  let mockSnowflakeConnection: sinon.SinonStubbedInstance<snowflake.Connection>;
  let mockStatement: snowflake.RowStatement;

  beforeEach(() => {
    config = {
      host: "test-account.snowflakecomputing.com",
      user: "test-user",
      password: "test-password",
      database: "test-db",
      connectionLimit: 10,
      multipleStatements: true,
      port: 443,
      schema: "TEST_SCHEMA",
      warehouse: "TEST_WAREHOUSE",
      role: "TEST_ROLE"
    };

    const mockColumn: snowflake.Column = {
      getName: () => "id",
      getIndex: () => 0,
      getId: () => 0,
      isNullable: () => false,
      getScale: () => 0,
      getType: () => "NUMBER",
      getPrecision: () => 0,
      isString: () => false,
      isBinary: () => false,
      isNumber: () => true,
      isBoolean: () => false,
      isDate: () => false,
      isTime: () => false,
      isTimestamp: () => false,
      isTimestampLtz: () => false,
      isTimestampNtz: () => false,
      isTimestampTz: () => false,
      isVariant: () => false,
      isObject: () => false,
      isArray: () => false,
      isMap: () => false,
      getRowValue: () => 1,
      getRowValueAsString: () => "1",
    };

    mockStatement = {
      getSqlText: () => "",
      getStatus: () => "complete" as snowflake.StatementStatus,
      getColumns: () => [mockColumn],
      getColumn: () => mockColumn,
      getNumRows: () => 0,
      getNumUpdatedRows: () => 0,
      getSessionState: () => ({}),
      getRequestId: () => "",
      getQueryId: () => "",
      getStatementId: () => "",
      cancel: () => {},
      streamRows: () => new Readable({ read() { this.push(null); } }),
      fetchRows: () => new Readable({ read() { this.push(null); } }),
      hasNext: () => () => false,
      NextResult: () => () => {},
    } as snowflake.RowStatement;

    mockSnowflakeConnection = {
      execute: sinon.stub().callsFake((options: snowflake.StatementOption) => {
        if (options.complete) {
          options.complete(undefined, mockStatement, [{ id: 1 }]);
        }
        return mockStatement;
      }),
      destroy: sinon.stub().callsFake((callback: () => void) => {
        callback();
        return Promise.resolve();
      }),
    } as any;

    mockPool = {
      acquire: sinon.stub().resolves(mockSnowflakeConnection),
      release: sinon.stub().resolves(),
    } as any;

    sinon.stub(snowflake, "createPool").returns(mockPool);
    connection = new SnowflakeConnection(config);
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should create a connection pool with correct configuration", () => {
    expect(snowflake.createPool).to.have.been.calledWith({
      account: config.host,
      username: config.user,
      password: config.password,
      database: config.database,
      schema: config.schema,
      warehouse: config.warehouse,
      role: config.role,
    }, {
      max: config.connectionLimit,
      min: 0,
      idleTimeoutMillis: 30000,
      acquireTimeoutMillis: 30000,
    });
  });

  it("should get a connection from the pool", async () => {
    const result = await connection.getConnection();
    expect(mockPool.acquire).to.have.been.called;
    expect(result).to.equal(connection);
  });

  it("should execute a query successfully", async () => {
    const [rows, stmt] = await connection.query("SELECT * FROM test");
    expect(mockSnowflakeConnection.execute).to.have.been.calledWith({
      sqlText: "SELECT * FROM test",
      binds: undefined,
      complete: sinon.match.func
    });
    expect(rows).to.deep.equal([{ id: 1 }]);
  });

  it("should handle query errors", async () => {
    const error = new Error("Query failed") as snowflake.SnowflakeError;
    mockSnowflakeConnection.execute.callsFake((options: snowflake.StatementOption) => {
      if (options.complete) {
        options.complete(error, mockStatement, []);
      }
      return mockStatement;
    });

    try {
      await connection.query("SELECT * FROM test");
      expect.fail("Should have thrown an error");
    } catch (err) {
      expect(err).to.equal(error);
    }
  });

  it("should end the connection", async () => {
    await connection.getConnection(); // Ensure connection is established
    await connection.end();
    expect(mockSnowflakeConnection.destroy).to.have.been.called;
  });

  it("should release the connection back to the pool", async () => {
    await connection.getConnection(); // Ensure connection is established
    await connection.release();
    expect(mockPool.release).to.have.been.calledWith(mockSnowflakeConnection);
  });
}); 