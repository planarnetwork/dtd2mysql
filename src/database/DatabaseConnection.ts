
export interface DatabaseConnection {

  query<T = void>(sql: any, parameters?: any[]): any;
  end(): Promise<void>;

}

export interface DatabaseConfiguration {
  host: string,
  user: string,
  password: string | null,
  database: string,
  connectionLimit: number,
  multipleStatements: boolean,
  promise?: any
}