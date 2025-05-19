export interface DatabaseConnection {
  getConnection(): Promise<DatabaseConnection>;
  query<RowType = unknown>(sql: any, parameters?: any[]): Promise<[RowType[], any]>;
  end(): Promise<void>;
  release(): Promise<void>;
}

export interface DatabaseConfiguration {
  host: string;
  user: string;
  password: string | null;
  database: string;
  port: number;
  connectionLimit: number;
  multipleStatements: boolean;
  schema?: string;
  warehouse?: string;
  role?: string;
}
