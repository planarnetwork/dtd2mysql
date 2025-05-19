import { Connection, ConnectionOptions, Pool, createPool } from "snowflake-sdk";
import { DatabaseConnection, DatabaseConfiguration } from "./DatabaseConnection";

export class SnowflakeConnection implements DatabaseConnection {
  private connection: Connection | null = null;
  private pool: Pool<Connection> | null = null;

  constructor(private config: DatabaseConfiguration) {
    const requiredFields = {
      host: "account",
      user: "username",
      password: "password",
      database: "database",
      schema: "schema",
      warehouse: "warehouse",
      role: "role"
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([key]) => !config[key as keyof DatabaseConfiguration])
      .map(([_, label]) => label);

    if (missingFields.length > 0) {
      throw new Error(`Snowflake configuration requires the following fields to be set: ${missingFields.join(", ")}`);
    }

    const options: ConnectionOptions = {
      account: config.host,
      username: config.user,
      password: config.password || "",
      database: config.database,
      schema: config.schema,
      warehouse: config.warehouse,
      role: config.role,
    };

    this.pool = createPool(options, {
      max: config.connectionLimit,
      min: 0,
      idleTimeoutMillis: 30000,
      acquireTimeoutMillis: 30000,
    });
  }

  async getConnection(): Promise<DatabaseConnection> {
    if (!this.connection) {
      this.connection = await this.pool!.acquire();
    }
    return this;
  }

  async query<RowType = unknown>(sql: string, parameters?: any[]): Promise<[RowType[], any]> {
    const connection = await this.getConnection();
    return new Promise((resolve, reject) => {
      this.connection!.execute({
        sqlText: sql,
        binds: parameters,
        complete: (err, stmt, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve([rows as RowType[], stmt]);
          }
        }
      });
    });
  }

  async end(): Promise<void> {
    if (this.connection) {
      await this.connection.destroy(() => {});
      this.connection = null;
    }
  }

  async release(): Promise<void> {
    if (this.connection) {
      await this.pool!.release(this.connection);
      this.connection = null;
    }
  }
} 